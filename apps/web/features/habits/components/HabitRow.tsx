'use client';

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
            className="shrink-0 rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-danger"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path
                fillRule="evenodd"
                d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.808a2.75 2.75 0 0 0 2.741-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z"
                clipRule="evenodd"
              />
            </svg>
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
