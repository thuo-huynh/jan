'use client';

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { CalendarDays, CalendarRange, Flame, Sparkles, Trophy } from 'lucide-react';
import { createClient } from '@/shared/supabase/client';
import { HabitRow } from './HabitRow';
import { AddHabitForm } from './AddHabitForm';
import { MonthNav } from './MonthNav';
import { TodayChecklist } from './TodayChecklist';
import { CelebrationBanner, type CelebrationMessage } from './CelebrationBanner';
import { todayIso, weekdayInitial } from '../lib/calendar';
import { computeHabitStreak, crossedMilestone } from '../lib/streak';
import type { IsoDate } from '../lib/streak';
import type { Habit, HabitCompletion } from '../types';

/**
 * Habit grid manager (T010) — owns the month-in-view's habit list +
 * completion state, wires day-cell tick/untick to direct Supabase mutations
 * under RLS with optimistic update + rollback-on-failure (matching the
 * Kanban board's optimistic task-move pattern from 001-tasknihongo). Also
 * owns the celebration queue (streak milestones + "all done today") fired
 * from handleToggleDay — computed inline against `today` rather than the
 * streakByHabit memo below, since that memo only recomputes after the
 * state update this same function triggers.
 */
interface HabitGridManagerProps {
  year: number;
  month: number;
  days: IsoDate[];
  initialHabits: Habit[];
  initialCompletions: HabitCompletion[];
}

function groupByHabit(completions: HabitCompletion[]): Map<string, Set<IsoDate>> {
  const map = new Map<string, Set<IsoDate>>();
  for (const c of completions) {
    const set = map.get(c.habit_id) ?? new Set<IsoDate>();
    set.add(c.completion_date);
    map.set(c.habit_id, set);
  }
  return map;
}

export function HabitGridManager({ year, month, days, initialHabits, initialCompletions }: HabitGridManagerProps) {
  const [habits, setHabits] = useState(initialHabits);
  const [completionsByHabit, setCompletionsByHabit] = useState(() => groupByHabit(initialCompletions));
  const [pendingByHabit, setPendingByHabit] = useState<Map<string, Set<IsoDate>>>(new Map());
  const [celebrations, setCelebrations] = useState<CelebrationMessage[]>([]);
  const today = todayIso();

  function pushCelebration(text: string) {
    setCelebrations((prev) => [...prev, { id: `${Date.now()}-${Math.random()}`, text }]);
  }

  function dismissCelebration(id: string) {
    setCelebrations((prev) => prev.filter((c) => c.id !== id));
  }

  const isCurrentMonthView = days.includes(today);
  const weeks = useMemo(() => {
    const chunks: IsoDate[][] = [];
    for (let end = days.length; end > 0; end -= 7) {
      chunks.unshift(days.slice(Math.max(0, end - 7), end));
    }
    return chunks;
  }, [days]);
  const currentWeekIndex = Math.max(0, weeks.findIndex((week) => week.includes(today)));
  const [selectedWeekIndex, setSelectedWeekIndex] = useState(isCurrentMonthView ? currentWeekIndex : weeks.length - 1);

  useEffect(() => {
    setSelectedWeekIndex(isCurrentMonthView ? currentWeekIndex : weeks.length - 1);
  }, [currentWeekIndex, isCurrentMonthView, weeks.length]);

  const selectedWeek = weeks[selectedWeekIndex] ?? weeks[0] ?? [];

  const streakByHabit = useMemo(() => {
    const map = new Map<string, number>();
    for (const habit of habits) {
      map.set(
        habit.id,
        computeHabitStreak(Array.from(completionsByHabit.get(habit.id) ?? []), new Date(`${today}T00:00:00`)),
      );
    }
    return map;
  }, [habits, completionsByHabit]);

  const stats = useMemo(() => {
    const doneToday = habits.filter((h) => completionsByHabit.get(h.id)?.has(today)).length;
    const totalDoneThisMonth = Array.from(completionsByHabit.values()).reduce((sum, set) => sum + set.size, 0);
    const totalPossibleThisMonth = habits.length * days.length;
    const completionRate =
      totalPossibleThisMonth > 0 ? Math.round((totalDoneThisMonth / totalPossibleThisMonth) * 100) : 0;
    return { doneToday, completionRate };
  }, [habits, completionsByHabit, today, days.length]);

  const doneTodaySet = useMemo(
    () => new Set(habits.filter((h) => completionsByHabit.get(h.id)?.has(today)).map((h) => h.id)),
    [habits, completionsByHabit, today],
  );

  const pendingTodayHabitIds = useMemo(
    () => new Set(habits.filter((h) => pendingByHabit.get(h.id)?.has(today)).map((h) => h.id)),
    [habits, pendingByHabit, today],
  );

  const recentDays = useMemo(() => {
    const visibleDays = isCurrentMonthView ? days.filter((date) => date <= today) : days;
    return visibleDays.slice(-7).map((date) => ({
      date,
      completed: habits.filter((habit) => completionsByHabit.get(habit.id)?.has(date)).length,
    }));
  }, [completionsByHabit, days, habits, isCurrentMonthView, today]);

  const bestStreak = Math.max(0, ...Array.from(streakByHabit.values()));
  const completionRatio = habits.length > 0 ? Math.round((stats.doneToday / habits.length) * 100) : 0;
  const monthLabel = new Intl.DateTimeFormat('vi-VN', { month: 'long', year: 'numeric' }).format(
    new Date(year, month - 1, 1),
  );

  function handleCreated(habit: Habit) {
    setHabits((prev) => [...prev, habit]);
  }

  async function handleRename(habitId: string, name: string) {
    const previous = habits.find((h) => h.id === habitId)?.name;
    setHabits((prev) => prev.map((h) => (h.id === habitId ? { ...h, name } : h)));

    const supabase = createClient();
    const { error } = await supabase.from('habits').update({ name }).eq('id', habitId);

    if (error && previous !== undefined) {
      setHabits((prev) => prev.map((h) => (h.id === habitId ? { ...h, name: previous } : h)));
    }
  }

  async function handleDelete(habitId: string) {
    const supabase = createClient();
    const { error } = await supabase.from('habits').delete().eq('id', habitId);
    if (!error) {
      setHabits((prev) => prev.filter((h) => h.id !== habitId));
      setCompletionsByHabit((prev) => {
        const next = new Map(prev);
        next.delete(habitId);
        return next;
      });
    }
  }

  function setPending(habitId: string, date: IsoDate, pending: boolean) {
    setPendingByHabit((prev) => {
      const next = new Map(prev);
      const set = new Set(next.get(habitId) ?? []);
      if (pending) set.add(date);
      else set.delete(date);
      next.set(habitId, set);
      return next;
    });
  }

  function setCompleted(habitId: string, date: IsoDate, completed: boolean) {
    setCompletionsByHabit((prev) => {
      const next = new Map(prev);
      const set = new Set(next.get(habitId) ?? []);
      if (completed) set.add(date);
      else set.delete(date);
      next.set(habitId, set);
      return next;
    });
  }

  async function handleToggleDay(habitId: string, date: IsoDate) {
    const wasCompleted = completionsByHabit.get(habitId)?.has(date) ?? false;

    // Celebrations only make sense for the act of completing *today* — a
    // user backfilling a past day in the month grid isn't "just now"
    // reaching a milestone, so date === today keeps this from firing on
    // retroactive edits.
    if (date === today && !wasCompleted) {
      const habit = habits.find((h) => h.id === habitId);
      const previousDates = Array.from(completionsByHabit.get(habitId) ?? []);
      const asOf = new Date(`${today}T00:00:00`);
      const oldStreak = computeHabitStreak(previousDates, asOf);
      const newStreak = computeHabitStreak([...previousDates, date], asOf);
      const milestone = crossedMilestone(oldStreak, newStreak);
      if (milestone && habit) {
        pushCelebration(`🔥 Chuỗi ${milestone} ngày cho "${habit.name}"!`);
      }
      if (habits.length > 0 && doneTodaySet.size + 1 >= habits.length) {
        pushCelebration('Đã hoàn thành tất cả thói quen hôm nay! 🎉');
      }
    }

    setCompleted(habitId, date, !wasCompleted);
    setPending(habitId, date, true);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = user
      ? wasCompleted
        ? await supabase
            .from('habit_completions')
            .delete()
            .eq('habit_id', habitId)
            .eq('completion_date', date)
        : await supabase
            .from('habit_completions')
            .insert({ habit_id: habitId, user_id: user.id, completion_date: date })
      : { error: new Error('Not signed in') };

    setPending(habitId, date, false);

    if (error) {
      // Rollback the optimistic flip.
      setCompleted(habitId, date, wasCompleted);
    }
  }

  return (
    <div className="space-y-6">
      <section className="habits-hero">
        <div className="relative z-10 max-w-xl">
          <p className="inline-flex items-center gap-2 rounded-full bg-card/70 px-3 py-1 text-xs font-bold text-primary">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> Nhịp duy trì của bạn
          </p>
          <h1 className="mt-4 text-3xl font-bold tracking-[-0.045em] text-foreground sm:text-4xl">
            Điều nhỏ nào bạn muốn giữ hôm nay?
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">
            Mỗi lần tích là một lời hứa được giữ lại. Không cần hoàn hảo, chỉ cần quay lại.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-4 text-sm">
            <span className="inline-flex items-center gap-1.5 font-semibold text-foreground">
              <CalendarRange className="h-4 w-4 text-primary" aria-hidden="true" /> {monthLabel}
            </span>
            {bestStreak > 0 && (
              <span className="inline-flex items-center gap-1.5 font-semibold text-primary">
                <Flame className="h-4 w-4" aria-hidden="true" /> Chuỗi tốt nhất {bestStreak} ngày
              </span>
            )}
          </div>
        </div>
        <div
          className="habit-orbit relative z-10 shrink-0"
          style={{ '--habit-progress': `${completionRatio * 3.6}deg` } as CSSProperties}
          role="img"
          aria-label={`Hoàn thành ${stats.doneToday} trên ${habits.length} thói quen hôm nay`}
        >
          <span className="text-2xl font-bold tracking-[-0.05em] text-foreground">{stats.doneToday}</span>
          <span className="mt-0.5 text-xs font-medium text-muted-foreground">trên {habits.length}</span>
          <span className="mt-1 text-[0.65rem] font-bold uppercase tracking-[0.12em] text-primary">hôm nay</span>
        </div>
      </section>

      <CelebrationBanner messages={celebrations} onDismiss={dismissCelebration} />

      {habits.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-card/80 p-10 text-center shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <CalendarDays className="h-6 w-6 text-primary" aria-hidden="true" />
          </div>
          <p className="max-w-xs text-sm text-muted-foreground">
            Chưa có thói quen nào. Thêm thói quen đầu tiên ở trên và bắt đầu tích ngày.
          </p>
          <AddHabitForm onCreated={handleCreated} />
        </div>
      ) : (
        <>
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(19rem,.7fr)]">
            {isCurrentMonthView && (
              <TodayChecklist
                habits={habits}
                doneToday={doneTodaySet}
                streakByHabit={streakByHabit}
                pendingHabitIds={pendingTodayHabitIds}
                onToggle={(habitId) => handleToggleDay(habitId, today)}
              />
            )}
            <section className="habit-week-card">
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-primary" aria-hidden="true" />
                <h2 className="font-semibold text-foreground">Bảy ngày gần đây</h2>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">Mỗi ô là số thói quen bạn đã hoàn thành.</p>
              <div className="mt-6 grid grid-cols-7 gap-2">
                {recentDays.map((day) => {
                  const height = habits.length ? Math.max(14, Math.round((day.completed / habits.length) * 100)) : 14;
                  return (
                    <div key={day.date} className="flex h-24 flex-col justify-end gap-2 text-center">
                      <span className="text-xs font-bold text-primary">{day.completed || ''}</span>
                      <div className="flex h-14 items-end rounded-xl bg-primary/10 px-1.5 pb-1.5">
                        <div className="w-full rounded-lg bg-primary transition-[height]" style={{ height: `${height}%` }} />
                      </div>
                      <span className="text-[0.65rem] font-semibold text-muted-foreground">
                        {new Intl.DateTimeFormat('vi-VN', { weekday: 'narrow' }).format(new Date(`${day.date}T00:00:00`))}
                      </span>
                    </div>
                  );
                })}
              </div>
              <p className="mt-5 text-sm font-semibold text-foreground">{stats.completionRate}% nhịp duy trì trong tháng</p>
            </section>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <MonthNav year={year} month={month} />
            <AddHabitForm onCreated={handleCreated} />
          </div>

          <section className="habit-calendar">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border px-5 py-4">
              <div>
                <h2 className="font-semibold text-foreground">Theo dõi theo tuần</h2>
                <p className="mt-1 text-sm text-muted-foreground">Mỗi chấm là một ngày bạn đã giữ lời hứa với mình.</p>
              </div>
              <span className="rounded-full bg-primary/10 px-3 py-1.5 text-sm font-semibold text-primary">
                {selectedWeek[0] && selectedWeek[selectedWeek.length - 1]
                  ? `${Number(selectedWeek[0].slice(-2))}-${Number(selectedWeek[selectedWeek.length - 1].slice(-2))} tháng ${month}`
                  : ''}
              </span>
            </div>
            <div className="flex gap-2 overflow-x-auto px-5 py-4">
              {weeks.map((week, index) => (
                <button
                  key={week[0]}
                  type="button"
                  onClick={() => setSelectedWeekIndex(index)}
                  className={`shrink-0 rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
                    selectedWeekIndex === index
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary'
                  }`}
                >
                  Tuần {index + 1}
                </button>
              ))}
            </div>
            <div className="overflow-x-auto px-3 pb-3 sm:px-5 sm:pb-5">
              <div className="habit-week-board min-w-[44rem]">
                <div className="habit-week-head">
                  <span className="habit-week-label">Thói quen</span>
                  {selectedWeek.map((date) => (
                    <span key={date} className={date === today ? 'text-primary' : undefined}>
                      <small>{weekdayInitial(date)}</small>
                      <strong>{Number(date.slice(-2))}</strong>
                    </span>
                  ))}
                  <span className="habit-week-summary">Nhịp tuần</span>
                </div>
                {habits.map((habit) => (
                  <HabitRow
                    key={habit.id}
                    habitName={habit.name}
                    days={selectedWeek}
                    completedDates={Array.from(completionsByHabit.get(habit.id) ?? [])}
                    todayIso={today}
                    onRename={(name) => handleRename(habit.id, name)}
                    pendingDates={pendingByHabit.get(habit.id) ?? new Set()}
                    onToggleDay={(date) => handleToggleDay(habit.id, date)}
                    onDelete={() => handleDelete(habit.id)}
                  />
                ))}
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
