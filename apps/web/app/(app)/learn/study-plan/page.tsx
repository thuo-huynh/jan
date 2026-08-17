import { redirect } from 'next/navigation';
import { createClient, getAuthedUser } from '@/shared/supabase/server';
import { StudyGoalSettings } from '@/features/study-plan/components/StudyGoalSettings';
import { StreakHeatmap } from '@/features/study-plan/components/StreakHeatmap';
import { StudyTimeChart } from '@/features/study-plan/components/StudyTimeChart';
import { aggregateDailyActivity, computeStreak, fillTrailingDays } from '@/features/study-plan/lib/heatmap';

const TRAILING_DAYS = 371; // ~53 weeks, so the heatmap grid always fills full Sun-Sat columns

/**
 * Study plan page (T070-T074's independent surface — not itself an
 * explicit tasks.md line item, but the "Independent Test" for US7 requires
 * a standalone way to set a goal and see the heatmap before the dashboard,
 * T077, exists; same pattern as other stories getting their own page).
 * Server Component fetches review_logs (for the heatmap/streak),
 * study_goals, and reading/listening logs (for the study-time chart).
 */
export default async function StudyPlanPage() {
  const supabase = createClient();
  const user = await getAuthedUser();

  if (!user) {
    redirect('/login');
  }

  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - TRAILING_DAYS);

  const [{ data: goals }, { data: reviewLogs }, { data: readingLogs }, { data: listeningLogs }] =
    await Promise.all([
      supabase.from('study_goals').select('daily_grammar_target, daily_vocab_target').eq('user_id', user.id).maybeSingle(),
      supabase
        .from('review_logs')
        .select('reviewed_at, vocab_id, grammar_id')
        .gte('reviewed_at', sinceDate.toISOString()),
      supabase.from('reading_logs').select('practiced_at, duration_min'),
      supabase.from('listening_logs').select('practiced_at, duration_min'),
    ]);

  const dailyGrammarTarget = goals?.daily_grammar_target ?? 0;
  const dailyVocabTarget = goals?.daily_vocab_target ?? 0;

  const activityByDay = aggregateDailyActivity(reviewLogs ?? [], {
    dailyGrammarTarget,
    dailyVocabTarget,
  });
  const days = fillTrailingDays(activityByDay, TRAILING_DAYS);
  const streak = computeStreak(activityByDay);

  const sessions = [
    ...(readingLogs ?? []).map((r: { practiced_at: string; duration_min: number }) => ({
      practicedAt: r.practiced_at,
      durationMin: r.duration_min,
    })),
    ...(listeningLogs ?? []).map((l: { practiced_at: string; duration_min: number }) => ({
      practicedAt: l.practiced_at,
      durationMin: l.duration_min,
    })),
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Study Plan</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Set a daily goal and track your consistency.
          </p>
        </div>
        <p className="text-sm text-muted-foreground">
          Current streak: <span className="font-semibold text-foreground">{streak}</span>{' '}
          {streak === 1 ? 'day' : 'days'}
        </p>
      </div>

      <StudyGoalSettings initialGrammarTarget={dailyGrammarTarget} initialVocabTarget={dailyVocabTarget} />

      <StreakHeatmap days={days} />

      <StudyTimeChart sessions={sessions} />
    </div>
  );
}
