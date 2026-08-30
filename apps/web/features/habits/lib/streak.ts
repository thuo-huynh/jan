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
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`;
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

export type StreakTier = 'spark' | 'on_fire' | 'blazing' | 'legendary';

const STREAK_TIERS: { min: number; tier: StreakTier; label: string }[] = [
  { min: 100, tier: 'legendary', label: 'Huyền thoại' },
  { min: 30, tier: 'blazing', label: 'Bùng cháy' },
  { min: 7, tier: 'on_fire', label: 'Đang nóng' },
  { min: 3, tier: 'spark', label: 'Khởi động' },
];

/**
 * Cosmetic streak-length tier for an escalating badge treatment (spark ->
 * on fire -> blazing -> legendary) — purely derived from the streak number
 * each render, no persistence or backend of its own. `null` below the
 * lowest threshold (3 days), where a plain streak count is enough.
 */
export function getStreakTier(streak: number): { tier: StreakTier; label: string } | null {
  return STREAK_TIERS.find((t) => streak >= t.min) ?? null;
}

/** Streak lengths (in days) worth a one-off celebration when first reached. */
export const STREAK_MILESTONES = [7, 30, 100] as const;

/**
 * The milestone `newStreak` just reached that `oldStreak` hadn't, or `null`
 * if this streak change didn't cross one. Used to fire a celebration toast
 * exactly once per milestone rather than on every render at that streak
 * length.
 */
export function crossedMilestone(oldStreak: number, newStreak: number): number | null {
  for (const milestone of STREAK_MILESTONES) {
    if (newStreak >= milestone && oldStreak < milestone) return milestone;
  }
  return null;
}
