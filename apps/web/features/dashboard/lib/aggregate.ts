import { createClient } from '@/shared/supabase/server';
import { aggregateDailyActivity, computeStreak } from '@/features/study-plan/lib/heatmap';
import {
  computeWeakAreas,
  listeningWeakArea,
  vocabWeakArea,
  weakestConfusablePair,
  weakestReadingPassageType,
  type WeakArea,
} from './weak-areas';

/**
 * Shared dashboard aggregation (T075's logic + T076's weak areas), called
 * directly by both `GET /api/dashboard` (app/api/dashboard/route.ts, for
 * external/contract consumers) and the dashboard page (app/(app)/learn/
 * dashboard/page.tsx) — a Server Component can call this directly without
 * an HTTP round trip to its own API route, so the two share one
 * implementation instead of the page re-deriving the same numbers.
 */
export interface DashboardData {
  grammar: { mastered: number; total: number };
  vocabKanjiLearned: number;
  reviewAccuracy: number | null;
  currentStreak: number;
  weakAreas: WeakArea[];
  examCountdownDays: number | null;
}

type ServerSupabaseClient = ReturnType<typeof createClient>;

export async function loadDashboardData(
  supabase: ServerSupabaseClient,
  userId: string,
): Promise<DashboardData> {
  const [
    { count: grammarTotal },
    { count: grammarMastered },
    { count: customVocabLearned },
    { count: globalVocabLearned },
    { data: reviewLogs },
    { data: readingLogs },
    { data: listeningLogs },
    { data: confusablePairs },
    { data: grammarPatterns },
    { data: goals },
  ] = await Promise.all([
    supabase.from('grammar_points').select('id', { count: 'exact', head: true }).is('user_id', null),
    supabase
      .from('user_grammar_status')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'mastered'),
    supabase
      .from('vocab_entries')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('srs_repetitions', 1),
    supabase
      .from('user_vocab_progress')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('srs_repetitions', 1),
    supabase.from('review_logs').select('vocab_id, grammar_id, result, reviewed_at').eq('user_id', userId),
    supabase.from('reading_logs').select('passage_type, comprehension_score').eq('user_id', userId),
    supabase.from('listening_logs').select('comprehension_score').eq('user_id', userId),
    supabase.from('grammar_confusable_pairs').select('id, grammar_point_id_a, grammar_point_id_b'),
    supabase.from('grammar_points').select('id, pattern'),
    supabase.from('study_goals').select('exam_date').eq('user_id', userId).maybeSingle(),
  ]);

  const logs = reviewLogs ?? [];
  const reviewAccuracy =
    logs.length === 0 ? null : logs.filter((l) => l.result !== 'again').length / logs.length;

  const activityByDay = aggregateDailyActivity(logs, { dailyGrammarTarget: 0, dailyVocabTarget: 0 });
  const currentStreak = computeStreak(activityByDay);

  const patternById = new Map((grammarPatterns ?? []).map((g: { id: string; pattern: string }) => [g.id, g.pattern]));

  const weakAreas = computeWeakAreas([
    weakestReadingPassageType(readingLogs ?? []),
    weakestConfusablePair(logs, confusablePairs ?? [], patternById),
    listeningWeakArea(listeningLogs ?? []),
    vocabWeakArea(logs),
  ]);

  let examCountdownDays: number | null = null;
  if (goals?.exam_date) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(`${goals.exam_date}T00:00:00`);
    const days = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    examCountdownDays = days >= 0 ? days : null;
  }

  return {
    grammar: { mastered: grammarMastered ?? 0, total: grammarTotal ?? 0 },
    vocabKanjiLearned: (customVocabLearned ?? 0) + (globalVocabLearned ?? 0),
    reviewAccuracy,
    currentStreak,
    weakAreas,
    examCountdownDays,
  };
}
