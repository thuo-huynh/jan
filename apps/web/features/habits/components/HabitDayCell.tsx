'use client';

import { useEffect, useRef, useState } from 'react';
import { Check } from 'lucide-react';

/**
 * Day-cell checkbox (T009) — tick/untick a single habit's completion for a
 * single day. Purely controlled: the parent (HabitGridManager) owns the
 * optimistic state + rollback-on-failure, this component just renders the
 * checkbox and reports clicks. Plays a brief pop animation on the
 * false->true transition (tracked locally via a ref so it fires once per
 * genuine tick, not on every re-render or on mount for already-completed
 * days when switching months).
 */
interface HabitDayCellProps {
  habitName: string;
  date: string;
  completed: boolean;
  isToday: boolean;
  isWeekend: boolean;
  disabled?: boolean;
  onToggle: () => void;
}

export function HabitDayCell({
  habitName,
  date,
  completed,
  isToday,
  isWeekend,
  disabled,
  onToggle,
}: HabitDayCellProps) {
  const day = Number(date.slice(-2));

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
    <td className={`p-0.5 text-center ${isWeekend ? 'bg-muted/60' : ''}`}>
      <button
        type="button"
        role="checkbox"
        aria-checked={completed}
        aria-label={`${habitName} — day ${day}${completed ? ', done' : ', not done'}`}
        disabled={disabled}
        onClick={onToggle}
        className={`h-7 w-7 rounded border transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
          completed
            ? 'border-primary bg-primary text-primary-foreground'
            : 'border-border bg-background hover:bg-muted'
        } ${isToday ? 'ring-2 ring-primary/50 ring-offset-1 ring-offset-card' : ''} ${justCompleted ? 'animate-habit-pop' : ''}`}
      >
        {completed && <Check className="mx-auto h-4 w-4" strokeWidth={2.5} aria-hidden="true" />}
      </button>
    </td>
  );
}
