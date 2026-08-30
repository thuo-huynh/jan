import { redirect } from 'next/navigation';
import { BookOpen, CalendarDays, Headphones, Trophy } from 'lucide-react';
import { createClient, getAuthedUser } from '@/shared/supabase/server';
import { loadHomeSummary } from '@/features/dashboard/lib/home';

export default async function ProgressPage() {
  const supabase = createClient();
  const user = await getAuthedUser();
  if (!user) redirect('/login');
  const summary = await loadHomeSummary(supabase, user.id);
  const cards = [
    {
      label: 'Hoàn thành thói quen tuần này',
      value: `${summary.habits.weeklyCompletionRate}%`,
      icon: CalendarDays,
    },
    { label: 'Chuỗi hiện tại', value: `${summary.habits.currentStreak} ngày`, icon: Trophy },
    { label: 'Ngữ pháp đã thuộc', value: summary.grammarMastered, icon: BookOpen },
    { label: 'Phút nghe tuần này', value: summary.listeningMinutes, icon: Headphones },
  ];
  return (
    <div className="space-y-9">
      <div>
        <h1 className="page-heading">Tiến độ của bạn</h1>
        <p className="page-intro">
          Nhìn lại nhịp học và thói quen để nhận ra điều gì đang giúp bạn đi tiếp.
        </p>
      </div>
      <div className="grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, value, icon: Icon }) => (
          <article key={label} className="bg-card p-5">
            <Icon className="h-5 w-5 text-primary" strokeWidth={1.75} aria-hidden="true" />
            <p className="mt-6 text-3xl font-semibold tracking-[-0.04em] text-foreground">
              {value}
            </p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">{label}</p>
          </article>
        ))}
      </div>
      <section className="card p-5 sm:p-6">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">Tuần vừa rồi</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Mỗi ô cho biết thời gian học và số lượt ôn bạn đã ghi lại.
        </p>
        <div className="mt-5 grid grid-cols-7 gap-px overflow-hidden rounded-lg border border-border bg-border">
          {summary.weeklyActivity.map((day) => (
            <div key={day.date} className="bg-card p-2 text-center">
              <p className="text-xs text-muted-foreground">{day.label}</p>
              <p className="mt-3 text-sm font-semibold text-foreground">{day.minutes}p</p>
              <p className="mt-1 text-xs text-muted-foreground">{day.reviews} lượt</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
