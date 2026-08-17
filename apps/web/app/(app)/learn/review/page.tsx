'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
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

export default function ReviewQueuePage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading review queue…</p>}>
      <ReviewSession />
    </Suspense>
  );
}

function ReviewSession() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const weakOnly = searchParams.get('weakOnly') === 'true';

  const [items, setItems] = useState<ReviewQueueItem[] | null>(null);
  const [index, setIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [reviewedCount, setReviewedCount] = useState(0);

  const loadQueue = useCallback(async () => {
    setItems(null);
    setIndex(0);
    setReviewedCount(0);
    setError(null);
    try {
      const res = await fetch(`/api/review-queue?weakOnly=${weakOnly}`, { cache: 'no-store' });
      if (!res.ok) {
        throw new Error('Failed to load review queue');
      }
      const data: ReviewQueueResponse = await res.json();
      setItems(data.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load review queue');
    }
  }, [weakOnly]);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

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
      throw new Error(body.error ?? 'Failed to submit review');
    }
    setReviewedCount((n) => n + 1);
    setIndex((i) => i + 1);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Review Queue</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Blended N2 vocab, kanji, and grammar due today.
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            checked={weakOnly}
            onChange={(e) => toggleWeakOnly(e.target.checked)}
            className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
          />
          Weak items only
        </label>
      </div>

      {error && <p className="error-text">{error}</p>}

      {items === null && !error && <p className="text-sm text-muted-foreground">Loading queue…</p>}

      {items !== null && items.length === 0 && (
        <div className="card p-8 text-center">
          <p className="text-foreground">
            {weakOnly ? 'No weak items right now — nice work.' : 'Nothing due for review right now.'}
          </p>
          <Link href="/learn/vocab" className="mt-3 inline-block text-sm font-medium text-primary hover:opacity-80">
            Browse the deck
          </Link>
        </div>
      )}

      {items !== null && items.length > 0 && index < items.length && (
        <>
          <p className="text-sm text-muted-foreground">
            Card {index + 1} of {items.length}
            {reviewedCount > 0 ? ` · ${reviewedCount} reviewed this session` : ''}
          </p>
          <ReviewCard
            key={items[index].itemId}
            item={items[index]}
            onGraded={(result, direction) => handleGraded(items[index], result, direction)}
          />
        </>
      )}

      {items !== null && items.length > 0 && index >= items.length && (
        <div className="card p-8 text-center">
          <p className="text-foreground">Session complete — {reviewedCount} card(s) reviewed.</p>
          <button type="button" onClick={loadQueue} className="btn-primary mt-3">
            Check for more due items
          </button>
        </div>
      )}
    </div>
  );
}
