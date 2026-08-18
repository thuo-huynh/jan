'use client';

import { useMemo, useState } from 'react';
import { CalendarCheck, CalendarDays, ListChecks, Percent } from 'lucide-react';
import { createClient } from '@/shared/supabase/client';
import { HabitRow } from './HabitRow';
import { AddHabitForm } from './AddHabitForm';
import { MonthNav } from './MonthNav';
import { TodayChecklist } from './TodayChecklist';
import { todayIso, weekdayInitial, isWeekend } from '../lib/calendar';
import { computeHabitStreak } from '../lib/streak';
import type { IsoDate } from '../lib/streak';
import type { Habit, HabitCompletion } from '../types';

/**
 * Habit grid manager (T010) — owns the month-in-view's habit list +
 * completion state, wires day-cell tick/untick to direct Supabase mutations
 * under RLS with optimistic update + rollback-on-failure (matching the
 * Kanban board's optimistic task-move pattern from 001-tasknihongo).
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
  const today = todayIso();

  const isCurrentMonthView = days.includes(today);

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
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <MonthNav year={year} month={month} />
        <AddHabitForm onCreated={handleCreated} />
      </div>

      {habits.length > 0 && isCurrentMonthView && (
        <TodayChecklist
          habits={habits}
          doneToday={doneTodaySet}
          streakByHabit={streakByHabit}
          pendingHabitIds={pendingTodayHabitIds}
          onToggle={(habitId) => handleToggleDay(habitId, today)}
        />
      )}

      {habits.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="card p-3 sm:p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <ListChecks className="h-4 w-4" aria-hidden="true" />
              <p className="text-xs sm:text-sm">Habits</p>
            </div>
            <p className="mt-1 text-xl font-semibold text-foreground sm:text-2xl">{habits.length}</p>
          </div>
          <div className="card p-3 sm:p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <CalendarCheck className="h-4 w-4" aria-hidden="true" />
              <p className="text-xs sm:text-sm">Done today</p>
            </div>
            <p className="mt-1 text-xl font-semibold text-foreground sm:text-2xl">
              {stats.doneToday}
              <span className="text-sm font-normal text-muted-foreground">/{habits.length}</span>
            </p>
          </div>
          <div className="card p-3 sm:p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Percent className="h-4 w-4" aria-hidden="true" />
              <p className="text-xs sm:text-sm">This month</p>
            </div>
            <p className="mt-1 text-xl font-semibold text-foreground sm:text-2xl">{stats.completionRate}%</p>
          </div>
        </div>
      )}

      {habits.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border p-10 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <CalendarDays className="h-6 w-6 text-primary" aria-hidden="true" />
          </div>
          <p className="max-w-xs text-sm text-muted-foreground">
            No habits yet. Add your first one above and start ticking off days.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-muted text-muted-foreground">
                <th
                  rowSpan={2}
                  className="sticky left-0 z-10 border-r border-border bg-muted px-2 py-1.5 text-left align-bottom font-medium"
                >
                  Habit
                </th>
                {days.map((date) => (
                  <th
                    key={date}
                    className={`w-7 px-0.5 pt-1.5 text-center text-[10px] font-normal ${isWeekend(date) ? 'bg-muted/60' : ''}`}
                  >
                    {weekdayInitial(date)}
                  </th>
                ))}
              </tr>
              <tr className="border-b border-border bg-muted text-muted-foreground">
                {days.map((date) => (
                  <th
                    key={date}
                    className={`w-7 px-0.5 pb-1.5 text-center font-medium ${date === today ? 'text-primary' : ''} ${isWeekend(date) ? 'bg-muted/60' : ''}`}
                  >
                    {Number(date.slice(-2))}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {habits.map((habit) => (
                <HabitRow
                  key={habit.id}
                  habitName={habit.name}
                  days={days}
                  completedDates={Array.from(completionsByHabit.get(habit.id) ?? [])}
                  todayIso={today}
                  onRename={(name) => handleRename(habit.id, name)}
                  pendingDates={pendingByHabit.get(habit.id) ?? new Set()}
                  onToggleDay={(date) => handleToggleDay(habit.id, date)}
                  onDelete={() => handleDelete(habit.id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
