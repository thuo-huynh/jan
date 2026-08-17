import { redirect } from 'next/navigation';
import { createClient, getAuthedUser } from '@/shared/supabase/server';
import { GrammarList } from '@/features/grammar/components/GrammarList';
import { mapGrammarPoint, type GrammarPointRecord, type UserGrammarStatusRecord } from '@/features/grammar/lib/mapGrammarPoint';
import type { ConfusablePairRef, GrammarPointWithProgress } from '@/features/grammar/types';

/**
 * Grammar list page (T041): browses the global N2 `grammar_points` catalog
 * joined against the current user's `user_grammar_status` (two queries,
 * combined in-memory — no row exists yet for points never touched, which
 * maps to the implicit "not_started" status per data-model.md). Also
 * resolves which points participate in a `grammar_confusable_pairs` row so
 * `GrammarPointRow` can render the comparison badge/link (T048).
 */
export default async function GrammarListPage() {
  const supabase = createClient();
  const user = await getAuthedUser();

  if (!user) {
    redirect('/login');
  }

  const [pointsResult, statusesResult, pairsResult] = await Promise.all([
    supabase
      .from('grammar_points')
      .select(
        'id, pattern, meaning, connection_form, formality_nuance, example_sentences, jlpt_level, frequency_tag, n3_overlap',
      )
      .is('user_id', null)
      .order('pattern', { ascending: true }),
    supabase.from('user_grammar_status').select('grammar_point_id, status, notes_user').eq('user_id', user.id),
    supabase.from('grammar_confusable_pairs').select('id, grammar_point_id_a, grammar_point_id_b'),
  ]);

  if (pointsResult.error) {
    throw new Error(`Failed to load grammar points: ${pointsResult.error.message}`);
  }

  const points = (pointsResult.data ?? []) as GrammarPointRecord[];
  const statuses = (statusesResult.data ?? []) as UserGrammarStatusRecord[];
  const pairs = pairsResult.data ?? [];

  const statusByPointId = new Map(statuses.map((s) => [s.grammar_point_id, s]));
  const patternById = new Map(points.map((p) => [p.id, p.pattern]));

  const pairsByPointId = new Map<string, ConfusablePairRef[]>();
  for (const pair of pairs) {
    const link = (pointId: string, partnerId: string) => {
      const list = pairsByPointId.get(pointId) ?? [];
      list.push({ pairId: pair.id, partnerId, partnerPattern: patternById.get(partnerId) ?? '' });
      pairsByPointId.set(pointId, list);
    };
    link(pair.grammar_point_id_a, pair.grammar_point_id_b);
    link(pair.grammar_point_id_b, pair.grammar_point_id_a);
  }

  const combined: GrammarPointWithProgress[] = points.map((point) =>
    mapGrammarPoint(point, statusByPointId.get(point.id), pairsByPointId.get(point.id) ?? []),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">N2 Grammar Tracker</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Browse the N2 grammar database, track your mastery, add personal notes, and compare
          confusable pairs.
        </p>
      </div>

      {combined.length === 0 ? (
        <div className="card p-8 text-center text-sm text-muted-foreground">
          No grammar points are available yet.
        </div>
      ) : (
        <GrammarList points={combined} userId={user.id} />
      )}
    </div>
  );
}
