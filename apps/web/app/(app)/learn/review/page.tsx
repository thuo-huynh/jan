'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle2, Inbox } from 'lucide-react';
import {
  ReviewCard,
  type ReviewQueueItem,
  type ReviewResult,
} from '@/features/vocab-srs/components/ReviewCard';

/**
 * Review queue page (T053) + "weak items only" toggle (T056). Pulls from
 * GET /api/review-queue and posts grades to POST /api/reviews — both routes
 * must be server-authoritative (research.md §3), so this page fetches
 * client-side rather than computing/faking any schedule itself. Wrapped in
 * Suspense because `useSearchParams` requires it in the App Router (same
 * pattern as app/(auth)/login/page.tsx).
 */

interface ReviewQueueResponse {
  items: ReviewQueueItem[];
}

const EMPTY_GRADE_COUNTS: Record<ReviewResult, number> = { again: 0, hard: 0, good: 0, easy: 0 };

export default function ReviewQueuePage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Đang tải hàng đợi ôn tập…</p>}>
      <ReviewSession />
    </Suspense>
  );
}

function ReviewSession() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const weakOnly = searchParams.get('weakOnly') === 'true';

  // The full due-today queue (every due item, each flagged `isWeak`) is
  // fetched once; the "weak items only" toggle just filters it client-side
  // instead of re-hitting the API, which also means the weak-item *count* is
  // always visible (badge below) even before the toggle is switched on —
  // previously the only way to see it was to flip the toggle and look at the
  // resulting queue length.
  const [allItems, setAllItems] = useState<ReviewQueueItem[] | null>(null);
  const [index, setIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [gradeCounts, setGradeCounts] = useState<Record<ReviewResult, number>>(EMPTY_GRADE_COUNTS);

  const loadQueue = useCallback(async () => {
    setAllItems(null);
    setIndex(0);
    setReviewedCount(0);
    setGradeCounts(EMPTY_GRADE_COUNTS);
    setError(null);
    try {
      const res = await fetch('/api/review-queue?weakOnly=false', { cache: 'no-store' });
      if (!res.ok) {
        throw new Error('Không tải được hàng đợi ôn tập');
      }
      const data: ReviewQueueResponse = await res.json();
      setAllItems(data.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được hàng đợi ôn tập');
    }
  }, []);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  const weakCount = useMemo(() => allItems?.filter((i) => i.isWeak).length ?? 0, [allItems]);
  const items = useMemo(() => {
    if (!allItems) return null;
    return weakOnly ? allItems.filter((i) => i.isWeak) : allItems;
  }, [allItems, weakOnly]);

  // Switching the toggle mid-session swaps to a differently-sized queue —
  // reset position so `index` can't point past the end of the new list.
  useEffect(() => {
    setIndex(0);
  }, [weakOnly]);

  function toggleWeakOnly(next: boolean) {
    const params = new URLSearchParams(searchParams.toString());
    if (next) {
      params.set('weakOnly', 'true');
    } else {
      params.delete('weakOnly');
    }
    router.push(`/learn/review${params.toString() ? `?${params.toString()}` : ''}`);
  }

  async function handleGraded(item: ReviewQueueItem, result: ReviewResult, direction?: string) {
    const res = await fetch('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        itemType: item.itemType,
        itemId: item.itemId,
        direction,
        result,
      }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}) as { error?: string });
      throw new Error(body.error ?? 'Không thể gửi kết quả ôn tập');
    }
    setReviewedCount((n) => n + 1);
    setGradeCounts((prev) => ({ ...prev, [result]: prev[result] + 1 }));
    setIndex((i) => i + 1);
  }

  const accuracy =
    reviewedCount > 0
      ? Math.round(((gradeCounts.good + gradeCounts.easy) / reviewedCount) * 100)
      : 0;

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="page-heading">Lịch ôn</h1>
          <p className="page-intro">
            Nhắc bạn ôn lại những mục đã học theo lịch cá nhân
            {allItems !== null && ` — ${allItems.length} mục cần ôn`}.
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            checked={weakOnly}
            onChange={(e) => toggleWeakOnly(e.target.checked)}
            className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
          />
          Chỉ mục yếu
          {allItems !== null && <span className="text-muted-foreground">({weakCount})</span>}
        </label>
      </div>

      {error && <p className="error-text">{error}</p>}

      {items === null && !error && (
        <div className="card animate-pulse space-y-4 p-8">
          <div className="flex items-center justify-between">
            <div className="h-5 w-16 rounded-full bg-muted" />
          </div>
          <div className="flex min-h-[10rem] flex-col items-center justify-center gap-3">
            <div className="h-10 w-32 rounded bg-muted" />
            <div className="h-4 w-48 rounded bg-muted" />
          </div>
          <div className="h-9 w-full rounded bg-muted" />
        </div>
      )}

      {items !== null && items.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border p-10 text-center">
          <div className="bg-primary/10 flex h-12 w-12 items-center justify-center rounded-full">
            <Inbox className="h-6 w-6 text-primary" aria-hidden="true" />
          </div>
          <p className="max-w-xs text-sm text-foreground">
            {weakOnly ? 'Không còn mục yếu nào — làm tốt lắm.' : 'Không có mục nào cần ôn lúc này.'}
          </p>
          <Link href="/learn/vocab" className="text-sm font-medium text-primary hover:opacity-80">
            Duyệt kho từ vựng
          </Link>
        </div>
      )}

      {items !== null && items.length > 0 && index < items.length && (
        <>
          <p className="text-sm text-muted-foreground">
            Thẻ {index + 1} / {items.length}
            {reviewedCount > 0 ? ` · đã ôn ${reviewedCount} thẻ trong phiên này` : ''}
          </p>
          <ReviewCard
            key={items[index].itemId}
            item={items[index]}
            onGraded={(result, direction) => handleGraded(items[index], result, direction)}
          />
        </>
      )}

      {items !== null && items.length > 0 && index >= items.length && (
        <div className="card space-y-4 p-8 text-center">
          <div className="bg-success/10 mx-auto flex h-12 w-12 items-center justify-center rounded-full">
            <CheckCircle2 className="h-6 w-6 text-success" aria-hidden="true" />
          </div>
          <div>
            <p className="text-lg font-semibold text-foreground">Đã hoàn thành phiên ôn tập</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Đã ôn {reviewedCount} thẻ · độ chính xác {accuracy}%
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-2 text-xs">
            {/* Literal class names (not template-constructed) so Tailwind's
                JIT scanner picks them up — see DESIGN.md's "SRS review
                grading" tokens. */}
            {gradeCounts.again > 0 && (
              <span className="rounded-full bg-srs-again px-2.5 py-1 font-medium text-white">
                Lại · {gradeCounts.again}
              </span>
            )}
            {gradeCounts.hard > 0 && (
              <span className="rounded-full bg-srs-hard px-2.5 py-1 font-medium text-white">
                Khó · {gradeCounts.hard}
              </span>
            )}
            {gradeCounts.good > 0 && (
              <span className="rounded-full bg-srs-good px-2.5 py-1 font-medium text-white">
                Tốt · {gradeCounts.good}
              </span>
            )}
            {gradeCounts.easy > 0 && (
              <span className="rounded-full bg-srs-easy px-2.5 py-1 font-medium text-white">
                Dễ · {gradeCounts.easy}
              </span>
            )}
          </div>
          <button type="button" onClick={loadQueue} className="btn-primary">
            Kiểm tra thêm mục cần ôn
          </button>
        </div>
      )}
    </div>
  );
}
