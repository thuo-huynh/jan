import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowRight, BookMarked, CalendarClock, Layers, Sparkles, Target } from 'lucide-react';
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

function getGreeting(hour: number): string {
  if (hour < 12) return 'Chào buổi sáng';
  if (hour < 18) return 'Chào buổi chiều';
  return 'Chào buổi tối';
}

function getMotivationalSubtitle(streak: number): string {
  const tier = getStreakTier(streak);
  if (streak === 0) return "Bắt đầu chuỗi ngày học hôm nay — mỗi lượt ôn tập đều có giá trị.";
  if (tier) return `Chuỗi ${tier.label.toLowerCase()} — giữ vững phong độ nhé.`;
  return 'Bạn đang tiến bộ đều — cứ tiếp tục như vậy.';
}

/**
 * Consolidated progress dashboard (T077) — mastery counters, heatmap
 * (T072), study-time chart (T073), weak-area summary (T076), exam
 * countdown (T064). Server Component; calls loadDashboardData directly
 * (same function GET /api/dashboard uses) plus the raw logs StreakHeatmap/
 * StudyTimeChart need for their own trailing-window rendering.
 *
 * Hero band uses `.grid-paper` + `.hanko-stamp` (DESIGN.md "Signature
 * element") — the genkouyoushi grid + ink-stamp streak badge are the app's
 * one deliberate visual signature, so they only appear here, not on every
 * card.
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
      label: 'Ngữ pháp đã thuộc',
      value: `${dashboard.grammar.mastered} / ${dashboard.grammar.total}`,
      href: '/learn/grammar',
      icon: BookMarked,
      iconClass: 'bg-primary/10 text-primary',
    },
    {
      key: 'vocab',
      label: 'Từ vựng & Hán tự đã học',
      value: String(dashboard.vocabKanjiLearned),
      href: '/learn/vocab',
      icon: Layers,
      iconClass: 'bg-secondary/10 text-secondary',
    },
    {
      key: 'accuracy',
      label: 'Độ chính xác ôn tập',
      value: dashboard.reviewAccuracy === null ? '—' : `${Math.round(dashboard.reviewAccuracy * 100)}%`,
      href: '/learn/review',
      icon: Target,
      iconClass: accuracyLow ? 'bg-warning/10 text-warning' : 'bg-success/10 text-success',
    },
  ];

  const streakTier = getStreakTier(dashboard.currentStreak);
  const formattedDate = new Intl.DateTimeFormat('vi-VN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date());

  return (
    <div className="space-y-6">
      <div className="grid-paper relative overflow-hidden rounded-lg border border-border bg-card p-5 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{formattedDate}</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {getGreeting(new Date().getHours())}
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">{getMotivationalSubtitle(dashboard.currentStreak)}</p>
          </div>
          {dashboard.currentStreak > 0 && (
            <div className="flex flex-col items-center gap-1.5">
              <div className="hanko-stamp">
                <span className="text-xl font-extrabold">{dashboard.currentStreak}</span>
                <span className="text-[9px] font-bold uppercase tracking-wide">ngày</span>
              </div>
              {streakTier && <span className="text-xs font-semibold text-muted-foreground">{streakTier.label}</span>}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link key={stat.key} href={stat.href} className="card-interactive p-4">
              <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full ${stat.iconClass}`}>
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>
              <p className="mt-2.5 text-xs text-muted-foreground">{stat.label}</p>
              <p className="mt-0.5 text-3xl font-bold tracking-tight text-foreground">{stat.value}</p>
            </Link>
          );
        })}
      </div>

      <div className="card p-4">
        <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold tracking-tight text-foreground">
          <CalendarClock className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          Đếm ngược kỳ thi
        </h2>
        {dashboard.examCountdownDays === null ? (
          <p className="text-sm text-muted-foreground">
            Đặt ngày thi trong{' '}
            <a href="/learn/mock-tests" className="font-medium text-primary hover:opacity-80">
              trang đề thi thử
            </a>{' '}
            để xem đếm ngược.
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
            <span className="text-sm text-muted-foreground">ngày nữa đến kỳ thi</span>
            {dashboard.examCountdownDays <= 14 && (
              <span className="badge-accent">
                {dashboard.examCountdownDays <= 3 ? 'Ngay tuần này!' : 'Nước rút!'}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="card p-4">
        <h2 className="mb-3 text-sm font-semibold tracking-tight text-foreground">Điểm cần cải thiện</h2>
        {dashboard.weakAreas.length === 0 ? (
          <div className="flex items-center gap-2.5 py-1 text-sm text-muted-foreground">
            <Sparkles className="h-4 w-4 shrink-0 text-success" aria-hidden="true" />
            Chưa có điểm yếu nào — cứ tiếp tục ôn tập, hệ thống sẽ gợi ý ở đây.
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
                    {i === 0 && <span className="badge-warning shrink-0">Cần chú ý</span>}
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className="text-muted-foreground">{Math.round(area.score * 100)}%</span>
                    <span className="flex items-center gap-0.5 text-xs font-medium text-primary">
                      Ôn ngay
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
