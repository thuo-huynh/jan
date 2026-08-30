import { redirect } from 'next/navigation';
import { BookOpenCheck } from 'lucide-react';
import { createClient, getAuthedUser } from '@/shared/supabase/server';
import { GrammarList } from '@/features/grammar/components/GrammarList';
import {
  mapGrammarPoint,
  type GrammarPointRecord,
  type UserGrammarStatusRecord,
} from '@/features/grammar/lib/mapGrammarPoint';
import type {
  ConfusablePairRef,
  GrammarPointWithProgress,
  GrammarSet,
} from '@/features/grammar/types';
import { LearningHero } from '@/shared/components/LearningHero';

/**
 * Grammar list page (T041): browses the global N2 `grammar_points` catalog
 * plus the caller's own custom points (`user_id = caller`, same
 * global-or-own shape as vocab_entries — see 0012_rls_reference_data.sql),
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

  const [pointsResult, statusesResult, pairsResult, setsResult] = await Promise.all([
    supabase
      .from('grammar_points')
      .select(
        'id, user_id, pattern, meaning, connection_form, formality_nuance, example_sentences, jlpt_level, frequency_tag, n3_overlap, set_id'
      )
      .or(`user_id.is.null,user_id.eq.${user.id}`)
      .order('pattern', { ascending: true }),
    supabase
      .from('user_grammar_status')
      .select('grammar_point_id, status, notes_user')
      .eq('user_id', user.id),
    supabase.from('grammar_confusable_pairs').select('id, grammar_point_id_a, grammar_point_id_b'),
    supabase
      .from('grammar_sets')
      .select('id, name, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true }),
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
    mapGrammarPoint(point, statusByPointId.get(point.id), pairsByPointId.get(point.id) ?? [])
  );
  const sets = (setsResult.data ?? []) as GrammarSet[];

  return (
    <div className="space-y-6">
      <LearningHero
        icon={BookOpenCheck}
        title="Ngữ pháp"
        description="Gom các mẫu câu theo mục tiêu riêng, thêm ghi chú và nhận diện những cặp dễ nhầm."
        tone="violet"
        meta={`${combined.length} mẫu câu trong kho của bạn`}
      />

      <GrammarList points={combined} userId={user.id} initialSets={sets} />
    </div>
  );
}
