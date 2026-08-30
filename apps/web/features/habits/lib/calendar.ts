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

/** Returns an ISO day shifted by `offset` calendar days without local-time drift. */
export function shiftIsoDate(date: IsoDate, offset: number): IsoDate {
  const [year, month, day] = date.split('-').map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + offset));
  return shifted.toISOString().slice(0, 10);
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
