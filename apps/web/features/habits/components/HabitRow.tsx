'use client';

import { useRef, useState, type KeyboardEvent } from 'react';
import { Flame, Trash2 } from 'lucide-react';
import { HabitDayCell } from './HabitDayCell';
import { computeHabitStreak, countCompletions } from '../lib/streak';
import { isWeekend } from '../lib/calendar';
import type { IsoDate } from '../lib/streak';

/**
 * One habit's row in the grid: name (click to rename), a day-cell per
 * visible day (T009), per-habit streak indicator (T005, FR-008), and delete
 * action (T012 — confirms, cascades completions per FR-006).
 */
interface HabitRowProps {
  habitName: string;
  days: IsoDate[];
  completedDates: IsoDate[];
  todayIso: string;
  pendingDates: Set<IsoDate>;
  onToggleDay: (date: IsoDate) => void;
  onRename: (name: string) => void;
  onDelete: () => void;
}

export function HabitRow({
  habitName,
  days,
  completedDates,
  todayIso,
  pendingDates,
  onToggleDay,
  onRename,
  onDelete,
}: HabitRowProps) {
  const completedSet = new Set(completedDates);
  const streak = computeHabitStreak(completedDates, new Date(`${todayIso}T00:00:00`));
  const count = countCompletions(completedDates);

  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(habitName);
  const inputRef = useRef<HTMLInputElement>(null);

  function startEditing() {
    setDraftName(habitName);
    setEditing(true);
    // Focus after the input mounts.
    requestAnimationFrame(() => inputRef.current?.select());
  }

  function commitRename() {
    const trimmed = draftName.trim();
    setEditing(false);
    if (trimmed && trimmed !== habitName) {
      onRename(trimmed);
    }
  }

  function handleNameKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.currentTarget.blur();
    } else if (event.key === 'Escape') {
      setDraftName(habitName);
      setEditing(false);
    }
  }

  function handleDelete() {
    if (confirm(`Delete "${habitName}"? Its completion history will be removed too.`)) {
      onDelete();
    }
  }

  return (
    <tr>
      <th scope="row" className="sticky left-0 z-10 bg-background px-2 py-1.5 text-left font-normal">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            {editing ? (
              <input
                ref={inputRef}
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                onBlur={commitRename}
                onKeyDown={handleNameKeyDown}
                autoFocus
                className="input-field h-7 w-40 px-2 py-0 text-sm font-medium"
              />
            ) : (
              <button
                type="button"
                onClick={startEditing}
                className="max-w-40 truncate rounded text-left text-sm font-medium text-foreground hover:text-primary sm:max-w-none"
                title="Click to rename"
              >
                {habitName}
              </button>
            )}
            <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
              {streak > 0 ? (
                <>
                  <Flame className="h-3 w-3 text-success" aria-hidden="true" />
                  <span className="font-medium text-success">{streak}-day streak</span>
                </>
              ) : (
                `${count} this month`
              )}
            </p>
            <div
              className="mt-1 h-1 w-full max-w-40 overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-label={`${habitName} — ${Math.round((count / days.length) * 100)}% this month`}
              aria-valuenow={Math.round((count / days.length) * 100)}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="h-full rounded-full bg-primary/60 transition-[width]"
                style={{ width: `${days.length > 0 ? (count / days.length) * 100 : 0}%` }}
              />
            </div>
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
          isWeekend={isWeekend(date)}
          disabled={pendingDates.has(date)}
          onToggle={() => onToggleDay(date)}
        />
      ))}
    </tr>
  );
}
