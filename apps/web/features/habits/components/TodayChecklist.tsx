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
    <section className="habit-today space-y-4">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-foreground">Nghi thức hôm nay</h2>
        <p className="mt-1 text-sm text-muted-foreground">Chạm vào một việc khi bạn đã hoàn thành.</p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
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
    </section>
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
      className={`flex min-h-14 items-center gap-3 rounded-2xl border px-3.5 py-3 text-left text-sm font-semibold transition-[transform,colors,box-shadow] active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50 ${
        completed
          ? 'border-primary bg-primary text-primary-foreground shadow-sm'
          : 'border-border bg-card text-foreground hover:border-primary/50 hover:shadow-sm'
      } ${justCompleted ? 'animate-habit-pop' : ''}`}
    >
      <span
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
          completed ? 'border-primary-foreground/70' : 'border-muted-foreground'
        }`}
      >
        {completed && <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" />}
      </span>
      {name}
      <StreakBadge streak={streak} variant={completed ? 'onFilled' : 'default'} className="text-xs" />
    </button>
  );
}
