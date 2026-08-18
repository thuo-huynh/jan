import type { IsoDate } from './streak';

/** All `YYYY-MM-DD` days in the given month (1-indexed `month`, 1-12). */
export function getMonthDays(year: number, month: number): IsoDate[] {
  const days: IsoDate[] = [];
  const daysInMonth = new Date(year, month, 0).getDate();
  for (let day = 1; day <= daysInMonth; day++) {
    const mm = String(month).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    days.push(`${year}-${mm}-${dd}`);
  }
  return days;
}

export function todayIso(): IsoDate {
  return new Date().toISOString().slice(0, 10);
}

const WEEKDAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const;

/** Single-letter weekday label (S M T W T F S) for a `YYYY-MM-DD` date, for grid headers. */
export function weekdayInitial(date: IsoDate): string {
  return WEEKDAY_INITIALS[new Date(`${date}T00:00:00`).getDay()];
}

/** Whether the given `YYYY-MM-DD` date falls on a Saturday or Sunday. */
export function isWeekend(date: IsoDate): boolean {
  const day = new Date(`${date}T00:00:00`).getDay();
  return day === 0 || day === 6;
}
