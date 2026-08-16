'use client';

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
  disabled?: boolean;
  onToggle: () => void;
}

export function HabitDayCell({ habitName, date, completed, isToday, disabled, onToggle }: HabitDayCellProps) {
  const day = Number(date.slice(-2));

  return (
    <td className={`p-0.5 text-center ${isToday ? 'bg-primary/5' : ''}`}>
      <button
        type="button"
        role="checkbox"
        aria-checked={completed}
        aria-label={`${habitName} — day ${day}${completed ? ', done' : ', not done'}`}
        disabled={disabled}
        onClick={onToggle}
        className={`h-6 w-6 rounded-md border transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
          completed
            ? 'border-primary bg-primary text-primary-foreground'
            : 'border-border bg-background hover:bg-muted'
        }`}
      >
        {completed && (
          <svg viewBox="0 0 20 20" fill="currentColor" className="mx-auto h-4 w-4">
            <path
              fillRule="evenodd"
              d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
              clipRule="evenodd"
            />
          </svg>
        )}
      </button>
    </td>
  );
}
