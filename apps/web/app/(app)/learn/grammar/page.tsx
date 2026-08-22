import { redirect } from 'next/navigation';
import { BookOpen } from 'lucide-react';
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
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Theo dõi Ngữ pháp N2</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Duyệt kho ngữ pháp N2, theo dõi mức độ thành thạo, thêm ghi chú cá nhân và so sánh các
          cặp dễ nhầm.
        </p>
      </div>

      {combined.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border p-10 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <BookOpen className="h-6 w-6 text-primary" aria-hidden="true" />
          </div>
          <p className="max-w-xs text-sm text-muted-foreground">
            Chưa có điểm ngữ pháp nào. Quay lại sau khi kho ngữ pháp N2 được cập nhật.
          </p>
        </div>
      ) : (
        <GrammarList points={combined} userId={user.id} />
      )}
    </div>
  );
}
