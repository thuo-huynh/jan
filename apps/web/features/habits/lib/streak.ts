/**
 * Per-habit streak/count calculator (T005, FR-008). Pure function — no I/O —
 * mirroring shared/srs/sm2.ts and features/study-plan/lib/heatmap.ts's own
 * pattern of small, testable aggregation helpers. Operates on whatever
 * completion dates are already in memory for the visible month (research.md
 * §5) rather than querying the DB itself.
 */

/** `YYYY-MM-DD` calendar day. */
export type IsoDate = string;

/**
 * Consecutive-day streak counting backward from `asOf` (defaults to today),
 * using only the given completion dates. Resets to 0 at the first gap,
 * including immediately if `asOf` itself has no completion.
 */
export function computeHabitStreak(completionDates: IsoDate[], asOf: Date = new Date()): number {
  const dates = new Set(completionDates);
  let streak = 0;
  const cursor = new Date(asOf);
  cursor.setHours(0, 0, 0, 0);

  for (;;) {
    const key = cursor.toISOString().slice(0, 10);
    if (!dates.has(key)) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/** Count of completed days within the given set of dates (e.g. the visible month). */
export function countCompletions(completionDates: IsoDate[]): number {
  return new Set(completionDates).size;
}
