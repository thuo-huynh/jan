'use client';

import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';

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
        className="flex h-9 w-9 items-center justify-center rounded border border-border text-foreground transition-colors hover:bg-muted"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
      </button>
      <span className="min-w-32 text-center text-sm font-medium text-foreground">
        {MONTH_LABELS[month - 1]} {year}
      </span>
      <button
        type="button"
        onClick={() => go(1)}
        aria-label="Next month"
        className="flex h-9 w-9 items-center justify-center rounded border border-border text-foreground transition-colors hover:bg-muted"
      >
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
