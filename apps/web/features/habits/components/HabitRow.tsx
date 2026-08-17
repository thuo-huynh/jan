'use client';

import { Trash2 } from 'lucide-react';
import { HabitDayCell } from './HabitDayCell';
import { computeHabitStreak, countCompletions } from '../lib/streak';
import type { IsoDate } from '../lib/streak';

/**
 * One habit's row in the grid: name, a day-cell per visible day (T009),
 * per-habit streak indicator (T005, FR-008), and delete action (T012 —
 * confirms, cascades completions per FR-006).
 */
interface HabitRowProps {
  habitName: string;
  days: IsoDate[];
  completedDates: IsoDate[];
  todayIso: string;
  pendingDates: Set<IsoDate>;
  onToggleDay: (date: IsoDate) => void;
  onDelete: () => void;
}

export function HabitRow({
  habitName,
  days,
  completedDates,
  todayIso,
  pendingDates,
  onToggleDay,
  onDelete,
}: HabitRowProps) {
  const completedSet = new Set(completedDates);
  const streak = computeHabitStreak(completedDates, new Date(`${todayIso}T00:00:00`));
  const count = countCompletions(completedDates);

  function handleDelete() {
    if (confirm(`Delete "${habitName}"? Its completion history will be removed too.`)) {
      onDelete();
    }
  }

  return (
    <tr>
      <th scope="row" className="sticky left-0 z-10 bg-background px-2 py-1 text-left font-normal">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-sm font-medium text-foreground">{habitName}</p>
            <p className="text-xs text-muted-foreground">
              {streak > 0 ? `${streak}-day streak` : `${count} this month`}
            </p>
          </div>
          <button
            type="button"
            onClick={handleDelete}
            aria-label={`Delete ${habitName}`}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-danger/10 hover:text-danger"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </th>
      {days.map((date) => (
        <HabitDayCell
          key={date}
          habitName={habitName}
          date={date}
          completed={completedSet.has(date)}
          isToday={date === todayIso}
          disabled={pendingDates.has(date)}
          onToggle={() => onToggleDay(date)}
        />
      ))}
    </tr>
  );
}
