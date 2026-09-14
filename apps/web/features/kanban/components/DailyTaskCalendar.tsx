'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { BoardColumn, BoardTask } from '../types';
import { todayDateKey } from '../lib/dates';

interface DailyTaskCalendarProps {
  columns: BoardColumn[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
}

interface DailySummary {
  todo: number;
  inProgress: number;
  done: number;
}

const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function localToday() {
  return todayDateKey();
}

function isDoneColumn(column: BoardColumn) {
  return /hoàn thành|done/i.test(column.name);
}

function isInProgressColumn(column: BoardColumn) {
  return /đang làm|in progress/i.test(column.name);
}

function summarize(tasks: BoardTask[], columns: BoardColumn[]): DailySummary {
  const columnById = new Map(columns.map((column) => [column.id, column]));
  return tasks.reduce<DailySummary>(
    (summary, task) => {
      const column = columnById.get(task.column_id);
      if (column && isDoneColumn(column)) summary.done += 1;
      else if (column && isInProgressColumn(column)) summary.inProgress += 1;
      else summary.todo += 1;
      return summary;
    },
    { todo: 0, inProgress: 0, done: 0 }
  );
}

/** A monthly daily-planning calendar with compact task-status signals per date. */
export function DailyTaskCalendar({ columns, selectedDate, onSelectDate }: DailyTaskCalendarProps) {
  const [monthCursor, setMonthCursor] = useState(() => {
    const initial = new Date(`${selectedDate}T00:00:00`);
    return new Date(initial.getFullYear(), initial.getMonth(), 1);
  });
  const tasks = useMemo(() => columns.flatMap((column) => column.tasks), [columns]);
  const summaries = useMemo(() => {
    const byDate = new Map<string, BoardTask[]>();
    for (const task of tasks) {
      if (!task.due_date) continue;
      byDate.set(task.due_date, [...(byDate.get(task.due_date) ?? []), task]);
    }
    return new Map(
      Array.from(byDate.entries(), ([date, dateTasks]) => [date, summarize(dateTasks, columns)])
    );
  }, [columns, tasks]);
  const selectedSummary = summaries.get(selectedDate) ?? { todo: 0, inProgress: 0, done: 0 };
  const totalForSelected = selectedSummary.todo + selectedSummary.inProgress + selectedSummary.done;

  const calendarDays = useMemo(() => {
    const firstWeekday = (monthCursor.getDay() + 6) % 7;
    const daysInMonth = new Date(
      monthCursor.getFullYear(),
      monthCursor.getMonth() + 1,
      0
    ).getDate();
    return Array.from({ length: firstWeekday + daysInMonth }, (_, index) => {
      if (index < firstWeekday) return null;
      return new Date(monthCursor.getFullYear(), monthCursor.getMonth(), index - firstWeekday + 1);
    });
  }, [monthCursor]);

  function selectDate(date: Date) {
    const value = dateKey(date);
    onSelectDate(value);
    setMonthCursor(new Date(date.getFullYear(), date.getMonth(), 1));
  }

  function selectDateKey(value: string) {
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    onSelectDate(value);
    setMonthCursor(new Date(date.getFullYear(), date.getMonth(), 1));
  }

  return (
    <section className="card overflow-hidden" aria-label="Lịch Daily Tasks">
      <div className="border-b border-border px-5 py-4 sm:flex sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold text-primary">Kế hoạch theo ngày</p>
          <h2 className="mt-1 text-lg font-semibold tracking-tight text-foreground">
            {new Intl.DateTimeFormat('vi-VN', { month: 'long', year: 'numeric' }).format(
              monthCursor
            )}
          </h2>
        </div>
        <div className="mt-3 flex items-center gap-2 sm:mt-0">
          <button
            type="button"
            onClick={() =>
              setMonthCursor(
                (current) => new Date(current.getFullYear(), current.getMonth() - 1, 1)
              )
            }
            aria-label="Tháng trước"
            className="btn-ghost h-9 w-9 px-0"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => selectDateKey(todayDateKey())}
            className="btn-outline h-9 px-3 text-xs"
          >
            Hôm nay
          </button>
          <button
            type="button"
            onClick={() =>
              setMonthCursor(
                (current) => new Date(current.getFullYear(), current.getMonth() + 1, 1)
              )
            }
            aria-label="Tháng sau"
            className="btn-ghost h-9 w-9 px-0"
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px bg-border">
        {WEEKDAYS.map((weekday) => (
          <div
            key={weekday}
            className="bg-muted px-1 py-2 text-center text-[11px] font-semibold text-muted-foreground"
          >
            {weekday}
          </div>
        ))}
        {calendarDays.map((date, index) => {
          if (!date) return <div key={`blank-${index}`} className="min-h-20 bg-card sm:min-h-24" />;
          const value = dateKey(date);
          const summary = summaries.get(value);
          const isSelected = value === selectedDate;
          const isToday = value === localToday();
          const total = summary ? summary.todo + summary.inProgress + summary.done : 0;
          return (
            <button
              key={value}
              type="button"
              onClick={() => selectDate(date)}
              aria-pressed={isSelected}
              aria-label={`${date.toLocaleDateString('vi-VN')}${total ? `, ${summary?.todo ?? 0} cần làm, ${summary?.inProgress ?? 0} đang làm, ${summary?.done ?? 0} hoàn thành` : ', chưa có công việc'}`}
              className={`relative min-h-20 bg-card p-2 text-left transition-colors sm:min-h-24 ${
                isSelected ? 'bg-primary/10 ring-2 ring-inset ring-primary' : 'hover:bg-muted/60'
              }`}
            >
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                  isToday ? 'bg-primary text-primary-foreground' : 'text-foreground'
                }`}
              >
                {date.getDate()}
              </span>
              {summary && total > 0 && (
                <div className="mt-2 flex flex-wrap gap-1" aria-hidden="true">
                  {summary.todo > 0 && <span className="h-1.5 w-1.5 rounded-full bg-warning" />}
                  {summary.inProgress > 0 && (
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  )}
                  {summary.done > 0 && <span className="h-1.5 w-1.5 rounded-full bg-success" />}
                  <span className="ml-1 text-[10px] font-medium text-muted-foreground">
                    {total}
                  </span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className="grid gap-px border-t border-border bg-border sm:grid-cols-[1.3fr_repeat(3,1fr)]">
        <div className="bg-card px-5 py-3">
          <p className="text-xs text-muted-foreground">
            {new Date(`${selectedDate}T00:00:00`).toLocaleDateString('vi-VN', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}
          </p>
          <p className="mt-1 text-sm font-semibold text-foreground">
            {totalForSelected ? `${totalForSelected} công việc trong ngày` : 'Chưa có công việc'}
          </p>
        </div>
        <SummaryCell label="Cần làm" value={selectedSummary.todo} className="text-warning" />
        <SummaryCell label="Đang làm" value={selectedSummary.inProgress} className="text-primary" />
        <SummaryCell label="Hoàn thành" value={selectedSummary.done} className="text-success" />
      </div>
    </section>
  );
}

function SummaryCell({
  label,
  value,
  className,
}: {
  label: string;
  value: number;
  className: string;
}) {
  return (
    <div className="bg-card px-5 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 text-lg font-semibold tabular-nums ${className}`}>{value}</p>
    </div>
  );
}
