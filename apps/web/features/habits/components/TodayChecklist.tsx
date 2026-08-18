'use client';

import { Check, Flame } from 'lucide-react';
import type { Habit } from '../types';

/**
 * Quick "did I do it today?" checklist — big, tappable pills, one per habit.
 * The month grid is great for spotting patterns but is a poor fit for the
 * single most common interaction (marking *today* done), especially on
 * mobile where the grid needs horizontal scrolling to even reach today's
 * column. This sits above the grid so the everyday action never requires
 * scrolling or hunting for a column. Only rendered when the viewed month
 * includes today (see HabitGridManager) — a past/future month has no
 * "today" to check off.
 */
interface TodayChecklistProps {
  habits: Habit[];
  doneToday: Set<string>;
  streakByHabit: Map<string, number>;
  pendingHabitIds: Set<string>;
  onToggle: (habitId: string) => void;
}

export function TodayChecklist({ habits, doneToday, streakByHabit, pendingHabitIds, onToggle }: TodayChecklistProps) {
  return (
    <div className="card space-y-3">
      <h2 className="text-sm font-semibold text-foreground">Today</h2>
      <div className="flex flex-wrap gap-2">
        {habits.map((habit) => {
          const completed = doneToday.has(habit.id);
          const streak = streakByHabit.get(habit.id) ?? 0;
          const pending = pendingHabitIds.has(habit.id);
          return (
            <button
              key={habit.id}
              type="button"
              onClick={() => onToggle(habit.id)}
              disabled={pending}
              aria-pressed={completed}
              className={`flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                completed
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-background text-foreground hover:bg-muted'
              }`}
            >
              <span
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                  completed ? 'border-primary-foreground/70' : 'border-muted-foreground'
                }`}
              >
                {completed && <Check className="h-3 w-3" strokeWidth={3} aria-hidden="true" />}
              </span>
              {habit.name}
              {streak > 0 && (
                <span
                  className={`flex items-center gap-0.5 text-xs ${completed ? 'text-primary-foreground/85' : 'text-success'}`}
                >
                  <Flame className="h-3 w-3" aria-hidden="true" />
                  {streak}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
