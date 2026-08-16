import { redirect } from 'next/navigation';
import { createClient, getAuthedUser } from '@/shared/supabase/server';
import { loadDashboardData } from '@/features/dashboard/lib/aggregate';
import { aggregateDailyActivity, fillTrailingDays } from '@/features/study-plan/lib/heatmap';
import { StreakHeatmap } from '@/features/study-plan/components/StreakHeatmap';
import { StudyTimeChart } from '@/features/study-plan/components/StudyTimeChart';
import type { WeakAreaType } from '@/features/dashboard/lib/weak-areas';

const TRAILING_DAYS = 371;

const WEAK_AREA_ICON: Record<WeakAreaType, string> = {
  reading_passage_type: '読',
  grammar_confusable: '文',
  listening: '聴',
  vocab: '語',
};

/**
 * Consolidated progress dashboard (T077) — mastery counters, heatmap
 * (T072), study-time chart (T073), weak-area summary (T076), exam
 * countdown (T064). Server Component; calls loadDashboardData directly
 * (same function GET /api/dashboard uses) plus the raw logs StreakHeatmap/
 * StudyTimeChart need for their own trailing-window rendering.
 */
export default async function DashboardPage() {
  const supabase = createClient();
  const user = await getAuthedUser();

  if (!user) {
    redirect('/login');
  }

  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - TRAILING_DAYS);

  const [dashboard, { data: reviewLogs }, { data: goals }, { data: readingLogs }, { data: listeningLogs }] =
    await Promise.all([
      loadDashboardData(supabase, user.id),
      supabase
        .from('review_logs')
        .select('reviewed_at, vocab_id, grammar_id')
        .eq('user_id', user.id)
        .gte('reviewed_at', sinceDate.toISOString()),
      supabase.from('study_goals').select('daily_grammar_target, daily_vocab_target').eq('user_id', user.id).maybeSingle(),
      supabase.from('reading_logs').select('practiced_at, duration_min').eq('user_id', user.id),
      supabase.from('listening_logs').select('practiced_at, duration_min').eq('user_id', user.id),
    ]);

  const activityByDay = aggregateDailyActivity(reviewLogs ?? [], {
    dailyGrammarTarget: goals?.daily_grammar_target ?? 0,
    dailyVocabTarget: goals?.daily_vocab_target ?? 0,
  });
  const days = fillTrailingDays(activityByDay, TRAILING_DAYS);

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

  const stats = [
    {
      label: 'Grammar mastered',
      value: `${dashboard.grammar.mastered} / ${dashboard.grammar.total}`,
    },
    { label: 'Vocab & kanji learned', value: String(dashboard.vocabKanjiLearned) },
    {
      label: 'Review accuracy',
      value: dashboard.reviewAccuracy === null ? '—' : `${Math.round(dashboard.reviewAccuracy * 100)}%`,
    },
    { label: 'Current streak', value: `${dashboard.currentStreak} ${dashboard.currentStreak === 1 ? 'day' : 'days'}` },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your N2 study progress at a glance.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">{stat.label}</p>
            <p className="mt-1 text-2xl font-semibold text-foreground">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-border bg-card p-4">
        <h2 className="mb-2 text-sm font-semibold text-foreground">Exam countdown</h2>
        {dashboard.examCountdownDays === null ? (
          <p className="text-sm text-muted-foreground">
            Set your exam date on the{' '}
            <a href="/learn/mock-tests" className="text-primary hover:underline">
              mock tests page
            </a>{' '}
            to see a countdown.
          </p>
        ) : (
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-semibold text-foreground">{dashboard.examCountdownDays}</span>
            <span className="text-sm text-muted-foreground">
              {dashboard.examCountdownDays === 1 ? 'day' : 'days'} until the exam
            </span>
          </div>
        )}
      </div>

      <div className="rounded-lg border border-border bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold text-foreground">Weak areas</h2>
        {dashboard.weakAreas.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Not enough activity yet to identify a weak area.
          </p>
        ) : (
          <ul className="space-y-2">
            {dashboard.weakAreas.map((area, i) => (
              <li key={`${area.type}-${area.label}`} className="flex items-center justify-between gap-2 text-sm">
                <span className="flex items-center gap-2 text-foreground">
                  <span className="font-jp text-xs text-muted-foreground">{WEAK_AREA_ICON[area.type]}</span>
                  {area.label}
                  {i === 0 && (
                    <span className="rounded-full bg-warning/15 px-2 py-0.5 text-xs font-medium text-warning">
                      Needs attention
                    </span>
                  )}
                </span>
                <span className="text-muted-foreground">{Math.round(area.score * 100)}%</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <StreakHeatmap days={days} />

      <StudyTimeChart sessions={sessions} />
    </div>
  );
}
