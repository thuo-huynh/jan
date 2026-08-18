'use client';

import { Check } from 'lucide-react';

/**
 * Day-cell checkbox (T009) — tick/untick a single habit's completion for a
 * single day. Purely controlled: the parent (HabitGridManager) owns the
 * optimistic state + rollback-on-failure, this component just renders the
 * checkbox and reports clicks.
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
        } ${isToday ? 'ring-2 ring-primary/50 ring-offset-1 ring-offset-card' : ''}`}
      >
        {completed && <Check className="mx-auto h-4 w-4" strokeWidth={2.5} aria-hidden="true" />}
      </button>
    </td>
  );
}
