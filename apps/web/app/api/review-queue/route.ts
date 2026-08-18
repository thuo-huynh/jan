import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/shared/supabase/server';
import { loadDueReviewQueue, type ReviewQueueItem } from '@/features/vocab-srs/lib/queue';

/**
 * GET /api/review-queue — T049.
 *
 * Returns the blended, due-today review queue combining vocab/kanji and
 * grammar items for the caller (contracts/api.md). "Due" means either the
 * item has never been reviewed by this user (no per-user progress row yet —
 * research.md §7 lazy-row pattern) or its recorded `srs_due_date <= today`.
 * The due/weak computation itself lives in `loadDueReviewQueue`
 * (features/vocab-srs/lib/queue.ts), shared with the vocab deck page's
 * "X due today" summary card so the two never drift on what counts as due.
 *
 * `weakOnly=true` narrows the already-due set further using `isWeakItem()`
 * from shared/srs/sm2.ts (FR-021) — it does not surface not-yet-due weak
 * items, matching this endpoint's own contract description ("the blended,
 * due-today review queue ... optionally restricted to weak items").
 */
export const dynamic = 'force-dynamic';

export type { ReviewQueueItem };

export async function GET(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const weakOnly = request.nextUrl.searchParams.get('weakOnly') === 'true';

  let sortable;
  try {
    sortable = await loadDueReviewQueue(supabase, user.id);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to load queue' }, { status: 500 });
  }

  const filtered = weakOnly ? sortable.filter((s) => s.item.isWeak) : sortable;

  if (weakOnly) {
    // Acceptance Scenario 4: "sorted by weakest first" — highest fail count
    // first, ties broken by lowest ease (closer to the floor = weaker).
    filtered.sort((a, b) => b.failCount - a.failCount || a.ease - b.ease);
  } else {
    filtered.sort((a, b) => a.item.dueDate.localeCompare(b.item.dueDate));
  }

  return NextResponse.json({ items: filtered.map((s) => s.item) });
}
