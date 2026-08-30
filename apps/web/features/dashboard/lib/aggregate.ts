import { createClient } from '@/shared/supabase/server';
import { aggregateDailyActivity, computeStreak } from './daily-activity';
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
  ] = await Promise.all([
    supabase
      .from('grammar_points')
      .select('id', { count: 'exact', head: true })
      .or(`user_id.is.null,user_id.eq.${userId}`),
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

  return {
    grammar: { mastered: grammarMastered ?? 0, total: grammarTotal ?? 0 },
    vocabKanjiLearned: (customVocabLearned ?? 0) + (globalVocabLearned ?? 0),
    reviewAccuracy,
    currentStreak,
    weakAreas,
  };
}
