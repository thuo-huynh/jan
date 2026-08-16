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
