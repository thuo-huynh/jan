'use client';

import { useState } from 'react';
import { createClient } from '@/shared/supabase/client';
import { HabitRow } from './HabitRow';
import { AddHabitForm } from './AddHabitForm';
import { MonthNav } from './MonthNav';
import { todayIso } from '../lib/calendar';
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

  function handleCreated(habit: Habit) {
    setHabits((prev) => [...prev, habit]);
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

      {habits.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">No habits yet — add your first one above.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-muted text-muted-foreground">
                <th className="sticky left-0 z-10 bg-muted px-2 py-1.5 text-left font-medium">Habit</th>
                {days.map((date) => (
                  <th key={date} className="w-7 px-0.5 py-1.5 text-center font-medium">
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
