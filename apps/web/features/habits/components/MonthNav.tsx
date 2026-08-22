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

export function MonthNav({ year, month }: MonthNavProps) {
  const router = useRouter();
  const now = new Date();
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;

  function go(deltaMonths: number) {
    const date = new Date(year, month - 1 + deltaMonths, 1);
    const params = new URLSearchParams({
      year: String(date.getFullYear()),
      month: String(date.getMonth() + 1),
    });
    router.push(`/habits?${params.toString()}`);
  }

  function goToday() {
    router.push('/habits');
  }

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => go(-1)}
        aria-label="Tháng trước"
        className="flex h-9 w-9 items-center justify-center rounded border border-border text-foreground transition-colors hover:bg-muted"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
      </button>
      <span className="min-w-32 text-center text-sm font-medium text-foreground">
        Tháng {month} năm {year}
      </span>
      <button
        type="button"
        onClick={() => go(1)}
        aria-label="Tháng sau"
        className="flex h-9 w-9 items-center justify-center rounded border border-border text-foreground transition-colors hover:bg-muted"
      >
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </button>
      {!isCurrentMonth && (
        <button type="button" onClick={goToday} className="btn-outline h-9 px-3 text-sm">
          Hôm nay
        </button>
      )}
    </div>
  );
}
