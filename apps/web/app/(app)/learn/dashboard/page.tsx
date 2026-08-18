import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowRight, BookMarked, CalendarClock, Crown, Flame, Layers, Sparkles, Target } from 'lucide-react';
import { createClient, getAuthedUser } from '@/shared/supabase/server';
import { loadDashboardData } from '@/features/dashboard/lib/aggregate';
import { aggregateDailyActivity, fillTrailingDays } from '@/features/study-plan/lib/heatmap';
import { StreakHeatmap } from '@/features/study-plan/components/StreakHeatmap';
import { StudyTimeChart } from '@/features/study-plan/components/StudyTimeChart';
import type { WeakAreaType } from '@/features/dashboard/lib/weak-areas';
import { getStreakTier } from '@/features/habits/lib/streak';

const TRAILING_DAYS = 371;

const WEAK_AREA_ICON: Record<WeakAreaType, string> = {
  reading_passage_type: '読',
  grammar_confusable: '文',
  listening: '聴',
  vocab: '語',
};

const STREAK_TIER_ICON_CLASS: Record<string, string> = {
  spark: 'bg-accent/10 text-accent',
  on_fire: 'bg-warning/10 text-warning',
  blazing: 'bg-danger/10 text-danger',
  legendary: 'bg-primary/10 text-primary',
};

function getGreeting(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function getMotivationalSubtitle(streak: number): string {
  const tier = getStreakTier(streak);
  if (streak === 0) return "Let's start today's streak — every review counts.";
  if (tier) return `${tier.label} streak — keep the momentum going.`;
  return "You're building momentum — keep it up.";
}

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

  const accuracyLow = dashboard.reviewAccuracy !== null && dashboard.reviewAccuracy < 0.7;
  const stats = [
    {
      key: 'grammar',
      label: 'Grammar mastered',
      value: `${dashboard.grammar.mastered} / ${dashboard.grammar.total}`,
      href: '/learn/grammar',
      icon: BookMarked,
      iconClass: 'bg-primary/10 text-primary',
    },
    {
      key: 'vocab',
      label: 'Vocab & kanji learned',
      value: String(dashboard.vocabKanjiLearned),
      href: '/learn/vocab',
      icon: Layers,
      iconClass: 'bg-secondary/10 text-secondary',
    },
    {
      key: 'accuracy',
      label: 'Review accuracy',
      value: dashboard.reviewAccuracy === null ? '—' : `${Math.round(dashboard.reviewAccuracy * 100)}%`,
      href: '/learn/review',
      icon: Target,
      iconClass: accuracyLow ? 'bg-warning/10 text-warning' : 'bg-success/10 text-success',
    },
  ];

  const streakTier = getStreakTier(dashboard.currentStreak);

  return (
    <div className="space-y-6">
      <div className="card p-5 sm:p-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {getGreeting(new Date().getHours())}
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">{getMotivationalSubtitle(dashboard.currentStreak)}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link key={stat.key} href={stat.href} className="card-interactive p-4">
              <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full ${stat.iconClass}`}>
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>
              <p className="mt-2.5 text-xs text-muted-foreground">{stat.label}</p>
              <p className="mt-0.5 text-2xl font-bold tracking-tight text-foreground">{stat.value}</p>
            </Link>
          );
        })}

        <div className="card p-4">
          <span
            className={`inline-flex h-8 w-8 items-center justify-center rounded-full ${
              streakTier ? STREAK_TIER_ICON_CLASS[streakTier.tier] : 'bg-muted text-muted-foreground'
            }`}
          >
            {streakTier?.tier === 'legendary' ? (
              <Crown className="h-4 w-4 animate-pulse" aria-hidden="true" />
            ) : (
              <Flame className="h-4 w-4" aria-hidden="true" />
            )}
          </span>
          <p className="mt-2.5 text-xs text-muted-foreground">Current streak</p>
          <p className="mt-0.5 text-2xl font-bold tracking-tight text-foreground">
            {dashboard.currentStreak} {dashboard.currentStreak === 1 ? 'day' : 'days'}
          </p>
          {streakTier && <p className="mt-0.5 text-xs font-medium text-muted-foreground">{streakTier.label}</p>}
        </div>
      </div>

      <div className="card p-4">
        <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold tracking-tight text-foreground">
          <CalendarClock className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          Exam countdown
        </h2>
        {dashboard.examCountdownDays === null ? (
          <p className="text-sm text-muted-foreground">
            Set your exam date on the{' '}
            <a href="/learn/mock-tests" className="font-medium text-primary hover:opacity-80">
              mock tests page
            </a>{' '}
            to see a countdown.
          </p>
        ) : (
          <div className="flex flex-wrap items-baseline gap-2">
            <span
              className={`text-3xl font-bold tracking-tight ${
                dashboard.examCountdownDays <= 14 ? 'text-accent' : 'text-foreground'
              }`}
            >
              {dashboard.examCountdownDays}
            </span>
            <span className="text-sm text-muted-foreground">
              {dashboard.examCountdownDays === 1 ? 'day' : 'days'} until the exam
            </span>
            {dashboard.examCountdownDays <= 14 && (
              <span className="badge-accent">
                {dashboard.examCountdownDays <= 3 ? 'This week!' : 'Final stretch'}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="card p-4">
        <h2 className="mb-3 text-sm font-semibold tracking-tight text-foreground">Weak areas</h2>
        {dashboard.weakAreas.length === 0 ? (
          <div className="flex items-center gap-2.5 py-1 text-sm text-muted-foreground">
            <Sparkles className="h-4 w-4 shrink-0 text-success" aria-hidden="true" />
            Nothing to flag yet — keep reviewing and we&apos;ll surface weak spots here.
          </div>
        ) : (
          <ul className="space-y-1">
            {dashboard.weakAreas.map((area, i) => (
              <li key={`${area.type}-${area.label}`}>
                <Link
                  href={area.href}
                  className="flex items-center justify-between gap-2 rounded px-1.5 py-1.5 text-sm transition-colors hover:bg-muted"
                >
                  <span className="flex min-w-0 items-center gap-2 text-foreground">
                    <span className="font-jp text-xs text-muted-foreground">{WEAK_AREA_ICON[area.type]}</span>
                    <span className="truncate">{area.label}</span>
                    {i === 0 && <span className="badge-warning shrink-0">Needs attention</span>}
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className="text-muted-foreground">{Math.round(area.score * 100)}%</span>
                    <span className="flex items-center gap-0.5 text-xs font-medium text-primary">
                      Review
                      <ArrowRight className="h-3 w-3" aria-hidden="true" />
                    </span>
                  </span>
                </Link>
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
