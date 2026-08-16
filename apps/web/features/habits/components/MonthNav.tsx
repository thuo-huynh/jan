'use client';

import { useRouter } from 'next/navigation';

/**
 * Month navigation (T013) — prev/next controls that push a new
 * `?year=&month=` URL, letting the Server Component page re-fetch that
 * month's data (same "URL params drive server refetch" pattern already used
 * by the vocab deck's pagination and the notes list's filters).
 */
interface MonthNavProps {
  year: number;
  month: number;
}

const MONTH_LABELS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export function MonthNav({ year, month }: MonthNavProps) {
  const router = useRouter();

  function go(deltaMonths: number) {
    const date = new Date(year, month - 1 + deltaMonths, 1);
    const params = new URLSearchParams({
      year: String(date.getFullYear()),
      month: String(date.getMonth() + 1),
    });
    router.push(`/habits?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => go(-1)}
        aria-label="Previous month"
        className="rounded-md border border-border p-1.5 text-foreground transition-colors hover:bg-muted"
      >
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
          <path
            fillRule="evenodd"
            d="M12.79 5.23a.75.75 0 0 1 0 1.06L9.06 10l3.73 3.71a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z"
            clipRule="evenodd"
          />
        </svg>
      </button>
      <span className="min-w-32 text-center text-sm font-medium text-foreground">
        {MONTH_LABELS[month - 1]} {year}
      </span>
      <button
        type="button"
        onClick={() => go(1)}
        aria-label="Next month"
        className="rounded-md border border-border p-1.5 text-foreground transition-colors hover:bg-muted"
      >
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
          <path
            fillRule="evenodd"
            d="M7.21 14.77a.75.75 0 0 1 0-1.06L10.94 10 7.21 6.29a.75.75 0 1 1 1.06-1.06l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0Z"
            clipRule="evenodd"
          />
        </svg>
      </button>
    </div>
  );
}
