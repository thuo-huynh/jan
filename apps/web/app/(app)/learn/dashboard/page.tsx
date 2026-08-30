import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  ArrowRight,
  BookOpen,
  Brain,
  ChartNoAxesColumnIncreasing,
  CircleCheck,
  Headphones,
  Library,
} from 'lucide-react';
import { createClient, getAuthedUser } from '@/shared/supabase/server';
import { TodayHabitList } from '@/features/habits/components/TodayHabitList';
import { loadHomeSummary } from '@/features/dashboard/lib/home';

function greeting(hour: number) {
  if (hour < 12) return 'Chào buổi sáng';
  if (hour < 18) return 'Chào buổi chiều';
  return 'Chào buổi tối';
}

export default async function DashboardPage() {
  const supabase = createClient();
  const user = await getAuthedUser();
  if (!user) redirect('/login');

  const summary = await loadHomeSummary(supabase, user.id);
  const date = new Intl.DateTimeFormat('vi-VN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date());
  const totalMinutes = summary.readingMinutes + summary.listeningMinutes;
  const highestActivity = Math.max(
    1,
    ...summary.weeklyActivity.map((day) => day.minutes + day.reviews * 5)
  );

  return (
    <div className="space-y-7">
      <section className="daily-sheet">
        <div className="max-w-2xl pl-2">
          <p className="inline-flex items-center gap-2 rounded-full bg-card/70 px-3 py-1 text-xs font-bold text-primary">
            <SparkleDot /> {date}
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-[-0.04em] text-foreground sm:text-5xl">
            {greeting(new Date().getHours())}
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">
            Chỉ cần hoàn thành bước kế tiếp, JanGo sẽ ghi nhận phần còn lại.
          </p>
          <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-foreground">
            <span>
              <strong className="font-semibold">
                {summary.habits.completedToday}/{summary.habits.totalHabits}
              </strong>{' '}
              thói quen đã xong
            </span>
            {summary.habits.currentStreak > 0 && (
              <span>
                <strong className="font-semibold">{summary.habits.currentStreak} ngày</strong> duy
                trì liên tiếp
              </span>
            )}
          </div>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(18rem,.75fr)]">
        <section className="skill-card p-5 sm:p-6">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-foreground">
                Thói quen hôm nay
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Đánh dấu ngay khi bạn hoàn thành.
              </p>
            </div>
            <Link href="/habits" className="section-link">
              Xem lịch
            </Link>
          </div>
          <TodayHabitList initialHabits={summary.habits.todayHabits} date={summary.habits.today} />
        </section>
        <section className="relative overflow-hidden rounded-2xl border border-border bg-primary p-5 text-primary-foreground shadow-sm sm:p-6">
          <div className="absolute right-5 top-5 text-4xl" aria-hidden="true">🦊</div>
          <Brain className="h-6 w-6" strokeWidth={1.75} aria-hidden="true" />
          <h2 className="mt-5 text-xl font-semibold tracking-tight">Tiếp tục học</h2>
          <p className="mt-2 max-w-[18rem] text-sm leading-6 text-primary-foreground/80">
            {summary.dueReviews > 0
              ? `${summary.dueReviews} mục nên được ôn lại hôm nay.`
              : 'Chưa có mục cần ôn. Chọn một kho cá nhân để bắt đầu.'}
          </p>
          <Link
            href={summary.dueReviews > 0 ? '/learn/review' : '/learn/vocab'}
            className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-card px-4 text-sm font-bold text-primary transition-transform hover:-translate-y-0.5"
          >
            {summary.dueReviews > 0 ? 'Ôn lại ngay' : 'Mở kho từ'}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </section>
      </div>

      <section>
        <div className="mb-5">
          <h2 className="text-lg font-semibold tracking-tight text-foreground">Nhịp học gần đây</h2>
          <p className="mt-1 text-sm text-muted-foreground">Tổng hợp từ hoạt động bạn đã lưu.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric
            href="/learn/grammar"
            icon={BookOpen}
            label="Ngữ pháp đã thuộc"
            value={summary.grammarMastered}
          />
          <Metric
            href="/learn/vocab"
            icon={Library}
            label="Từ vựng đã học"
            value={summary.vocabLearned}
          />
          <Metric
            href="/learn/reading"
            icon={BookOpen}
            label="Phút đọc tuần này"
            value={summary.readingMinutes}
          />
          <Metric
            href="/learn/listening"
            icon={Headphones}
            label="Phút nghe tuần này"
            value={summary.listeningMinutes}
          />
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,.8fr)]">
        <section className="skill-card p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-foreground">
                Hoạt động tuần này
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {totalMinutes} phút đọc và nghe trong 7 ngày gần đây.
              </p>
            </div>
            <ChartNoAxesColumnIncreasing className="h-5 w-5 text-primary" aria-hidden="true" />
          </div>
          <div className="mt-6 grid h-32 grid-cols-7 items-end gap-2">
            {summary.weeklyActivity.map((day) => {
              const value = day.minutes + day.reviews * 5;
              const height =
                value === 0 ? 6 : Math.max(14, Math.round((value / highestActivity) * 100));
              return (
                <div key={day.date} className="flex h-full flex-col justify-end gap-2 text-center">
                  <div
                    className="bg-primary/75 rounded-t transition-colors hover:bg-primary"
                    style={{ height: `${height}%` }}
                    title={`${day.minutes} phút, ${day.reviews} lượt ôn`}
                  />
                  <span className="text-xs text-muted-foreground">{day.label}</span>
                </div>
              );
            })}
          </div>
        </section>
        <section className="skill-card p-5 sm:p-6">
          <h2 className="text-lg font-semibold tracking-tight text-foreground">Độ đều đặn</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Tập trung vào nhịp duy trì, không phải áp lực hoàn hảo.
          </p>
          <div className="mt-6 space-y-4">
            <Consistency
              label="Hoàn thành tuần này"
              value={`${summary.habits.weeklyCompletionRate}%`}
            />
            <Consistency label="Chuỗi hiện tại" value={`${summary.habits.currentStreak} ngày`} />
            <Consistency
              label="Chuỗi tốt nhất gần đây"
              value={`${summary.habits.longestStreak} ngày`}
            />
          </div>
        </section>
      </div>
    </div>
  );
}

function Metric({
  href,
  icon: Icon,
  label,
  value,
}: {
  href: string;
  icon: typeof BookOpen;
  label: string;
  value: number;
}) {
  return (
    <Link href={href} className="skill-card block p-5">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
        <Icon className="h-5 w-5 text-primary" strokeWidth={1.75} aria-hidden="true" />
      </span>
      <p className="mt-6 text-3xl font-semibold tracking-[-0.04em] text-foreground">{value}</p>
      <p className="mt-1 text-sm text-muted-foreground">{label}</p>
    </Link>
  );
}

function SparkleDot() {
  return <CircleCheck className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden="true" />;
}

function Consistency({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-lg font-semibold text-foreground">{value}</span>
    </div>
  );
}
