'use client';

import { useEffect, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import { StreakBadge } from './StreakBadge';
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
        {habits.map((habit) => (
          <TodayPill
            key={habit.id}
            name={habit.name}
            completed={doneToday.has(habit.id)}
            streak={streakByHabit.get(habit.id) ?? 0}
            pending={pendingHabitIds.has(habit.id)}
            onToggle={() => onToggle(habit.id)}
          />
        ))}
      </div>
    </div>
  );
}

function TodayPill({
  name,
  completed,
  streak,
  pending,
  onToggle,
}: {
  name: string;
  completed: boolean;
  streak: number;
  pending: boolean;
  onToggle: () => void;
}) {
  const wasCompletedRef = useRef(completed);
  const [justCompleted, setJustCompleted] = useState(false);

  useEffect(() => {
    const was = wasCompletedRef.current;
    wasCompletedRef.current = completed;
    if (completed && !was) {
      setJustCompleted(true);
      const timer = setTimeout(() => setJustCompleted(false), 260);
      return () => clearTimeout(timer);
    }
  }, [completed]);

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={pending}
      aria-pressed={completed}
      className={`flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
        completed
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border bg-background text-foreground hover:bg-muted'
      } ${justCompleted ? 'animate-habit-pop' : ''}`}
    >
      <span
        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
          completed ? 'border-primary-foreground/70' : 'border-muted-foreground'
        }`}
      >
        {completed && <Check className="h-3 w-3" strokeWidth={3} aria-hidden="true" />}
      </span>
      {name}
      <StreakBadge streak={streak} variant={completed ? 'onFilled' : 'default'} className="text-xs" />
    </button>
  );
}
