import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient, getAuthedUser } from '@/shared/supabase/server';
import { ConfusablePairCard } from '@/features/grammar/components/ConfusablePairCard';
import { mapGrammarPoint, type GrammarPointRecord, type UserGrammarStatusRecord } from '@/features/grammar/lib/mapGrammarPoint';

interface ConfusablePairPageProps {
  params: { pairId: string };
}

/**
 * Confusable-pair comparison page (T046): loads a `grammar_confusable_pairs`
 * row plus its two constituent `grammar_points` (and the current user's
 * status/notes for each), then renders the side-by-side comparison
 * (T047/ConfusablePairCard). 404s if the pair id doesn't resolve to a
 * complete pair.
 */
export default async function ConfusablePairPage({ params }: ConfusablePairPageProps) {
  const supabase = createClient();
  const user = await getAuthedUser();

  if (!user) {
    redirect('/login');
  }

  const { data: pair, error: pairError } = await supabase
    .from('grammar_confusable_pairs')
    .select('id, grammar_point_id_a, grammar_point_id_b, comparison_note')
    .eq('id', params.pairId)
    .maybeSingle();

  if (pairError || !pair) {
    notFound();
  }

  const pointIds = [pair.grammar_point_id_a, pair.grammar_point_id_b];

  const [pointsResult, statusesResult] = await Promise.all([
    supabase
      .from('grammar_points')
      .select(
        'id, pattern, meaning, connection_form, formality_nuance, example_sentences, jlpt_level, frequency_tag, n3_overlap',
      )
      .in('id', pointIds),
    supabase
      .from('user_grammar_status')
      .select('grammar_point_id, status, notes_user')
      .eq('user_id', user.id)
      .in('grammar_point_id', pointIds),
  ]);

  const points = (pointsResult.data ?? []) as GrammarPointRecord[];
  if (pointsResult.error || points.length < 2) {
    notFound();
  }

  const statuses = (statusesResult.data ?? []) as UserGrammarStatusRecord[];
  const statusByPointId = new Map(statuses.map((s) => [s.grammar_point_id, s]));

  const recordA = points.find((p) => p.id === pair.grammar_point_id_a);
  const recordB = points.find((p) => p.id === pair.grammar_point_id_b);
  if (!recordA || !recordB) {
    notFound();
  }

  const pointA = mapGrammarPoint(recordA, statusByPointId.get(recordA.id));
  const pointB = mapGrammarPoint(recordB, statusByPointId.get(recordB.id));

  return (
    <div className="space-y-6">
      <div>
        <Link href="/learn/grammar" className="text-sm text-primary hover:underline">
          ← Back to grammar list
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">
          <span className="font-jp">{pointA.pattern}</span> vs.{' '}
          <span className="font-jp">{pointB.pattern}</span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Side-by-side comparison to help disambiguate this confusable pair.
        </p>
      </div>

      <ConfusablePairCard pointA={pointA} pointB={pointB} comparisonNote={pair.comparison_note} userId={user.id} />
    </div>
  );
}
