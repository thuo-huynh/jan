'use client';

import { useRef, useState, type KeyboardEvent } from 'react';
import { Trash2 } from 'lucide-react';
import { useConfirm } from '@/shared/hooks/useConfirm';
import { HabitDayCell } from './HabitDayCell';
import { StreakBadge } from './StreakBadge';
import { computeHabitStreak, countCompletions } from '../lib/streak';
import { isWeekend } from '../lib/calendar';
import type { IsoDate } from '../lib/streak';

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
  const completedThisWeek = completedDates.filter((date) => days.includes(date));
  const streak = computeHabitStreak(completedDates, new Date(`${todayIso}T00:00:00`));
  const count = countCompletions(completedThisWeek);
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(habitName);
  const inputRef = useRef<HTMLInputElement>(null);
  const { confirm, confirmDialog } = useConfirm();

  function commitRename() {
    const trimmed = draftName.trim();
    setEditing(false);
    if (trimmed && trimmed !== habitName) onRename(trimmed);
  }

  function handleNameKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') event.currentTarget.blur();
    if (event.key === 'Escape') {
      setDraftName(habitName);
      setEditing(false);
    }
  }

  async function handleDelete() {
    const ok = await confirm({
      title: `Xóa "${habitName}"?`,
      description: 'Lịch sử hoàn thành của thói quen này cũng sẽ bị xóa.',
    });
    if (ok) onDelete();
  }

  return (
    <div className="habit-week-row">
      <div className="min-w-0 px-3 py-3 sm:px-4">
        {confirmDialog}
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            {editing ? (
              <input
                ref={inputRef}
                value={draftName}
                onChange={(event) => setDraftName(event.target.value)}
                onBlur={commitRename}
                onKeyDown={handleNameKeyDown}
                autoFocus
                className="input-field h-8 w-40 px-2 py-0 text-sm font-medium"
              />
            ) : (
              <button
                type="button"
                onClick={() => {
                  setDraftName(habitName);
                  setEditing(true);
                  requestAnimationFrame(() => inputRef.current?.select());
                }}
                className="max-w-40 truncate rounded text-left text-sm font-semibold text-foreground hover:text-primary sm:max-w-none"
                title="Nhấn để đổi tên"
              >
                {habitName}
              </button>
            )}
            <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
              {streak > 0 ? (
                <>
                  <StreakBadge streak={streak} className="font-medium" />
                  <span>ngày liên tiếp</span>
                </>
              ) : (
                `${count} ngày trong tuần này`
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={handleDelete}
            aria-label={`Xóa ${habitName}`}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-danger/10 hover:text-danger"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
      {days.map((date) => (
        <div key={date} className="flex items-center justify-center border-t border-border py-3">
          <HabitDayCell
            habitName={habitName}
            date={date}
            completed={completedSet.has(date)}
            isToday={date === todayIso}
            isWeekend={isWeekend(date)}
            disabled={pendingDates.has(date)}
            onToggle={() => onToggleDay(date)}
          />
        </div>
      ))}
      <div className="habit-week-progress flex items-center justify-center gap-1.5 border-t border-border px-3 py-3" aria-label={`${count} trên ${days.length} ngày trong tuần`}>
        {days.map((date) => (
          <span key={date} className={`h-2 w-2 rounded-full ${completedSet.has(date) ? 'bg-primary' : 'bg-muted'}`} aria-hidden="true" />
        ))}
      </div>
    </div>
  );
}
