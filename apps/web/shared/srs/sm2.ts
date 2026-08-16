/**
 * Simplified SM-2-style spaced repetition scheduler, shared by vocab/kanji
 * reviews and grammar-point reviews (research.md §3). This is a pure
 * function — no I/O, no DB access — so it can run server-side inside
 * `app/api/reviews/route.ts` (never client-computed, per research.md §3 and
 * contracts/api.md) and be unit-tested in isolation.
 *
 * State shape intentionally mirrors the SRS columns shared across
 * `vocab_entries`, `user_vocab_progress`, and `user_grammar_status`
 * (data-model.md): interval (days), ease factor, consecutive-correct
 * repetitions, and a fail_count used to power "weak items only" mode
 * (FR-021).
 */

export type SrsResult = 'again' | 'hard' | 'good' | 'easy';

export interface SrsState {
  /** Current interval in days until the next scheduled review. */
  interval: number;
  /** SM-2-style ease factor; higher = interval grows faster on success. */
  ease: number;
  /** Consecutive-correct counter; reset to 0 on "again". */
  repetitions: number;
  /** Total number of "again" grades this item has ever received. */
  failCount: number;
}

export interface SrsUpdate extends SrsState {
  /** ISO `YYYY-MM-DD` date string for the next review. */
  dueDate: string;
}

/** Floor on ease so a heavily-failed item doesn't spiral to near-zero growth. */
const MIN_EASE = 1.3;
/** Default ease for a brand-new item (standard SM-2 starting value). */
export const DEFAULT_EASE = 2.5;
/** Shortest interval ("again" — review again the next day). */
const AGAIN_INTERVAL_DAYS = 1;
/** Interval used for the very first successful ("good") review. */
const FIRST_GOOD_INTERVAL_DAYS = 1;
/** Interval used for the second successful ("good") review. */
const SECOND_GOOD_INTERVAL_DAYS = 6;
/** Interval used for a first-ever "easy" review (skips ahead of "good"). */
const FIRST_EASY_INTERVAL_DAYS = 2;

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Computes the next SRS state + due date for an item given its current state
 * and a graded review result.
 *
 * State transitions (data-model.md "State Transitions"):
 * - `again`: resets repetitions to 0, shrinks interval to the shortest value,
 *   increments fail_count, and drops ease (a wrong answer means the item was
 *   easier-rated than it should have been).
 * - `hard`: grows interval modestly, repetitions still increases (the user
 *   did recall it, just with difficulty), ease drops slightly.
 * - `good`: grows interval normally following the SM-2 curve, repetitions
 *   increases, ease unchanged.
 * - `easy`: grows interval more aggressively than "good", repetitions
 *   increases, ease increases (future reviews will space out faster).
 */
export function computeNextReview(
  state: SrsState,
  result: SrsResult,
  now: Date = new Date(),
): SrsUpdate {
  const currentEase = state.ease > 0 ? state.ease : DEFAULT_EASE;

  switch (result) {
    case 'again': {
      const ease = Math.max(MIN_EASE, currentEase - 0.2);
      const interval = AGAIN_INTERVAL_DAYS;
      return {
        interval,
        ease,
        repetitions: 0,
        failCount: state.failCount + 1,
        dueDate: toIsoDate(addDays(now, interval)),
      };
    }
    case 'hard': {
      const ease = Math.max(MIN_EASE, currentEase - 0.15);
      const repetitions = state.repetitions + 1;
      // Modest growth: previous interval * a factor just above 1, with a
      // floor so a "hard" review never schedules sooner than "again" would.
      const interval = Math.max(
        AGAIN_INTERVAL_DAYS + 1,
        Math.round(state.interval * 1.2) || 2,
      );
      return {
        interval,
        ease,
        repetitions,
        failCount: state.failCount,
        dueDate: toIsoDate(addDays(now, interval)),
      };
    }
    case 'good': {
      const repetitions = state.repetitions + 1;
      let interval: number;
      if (repetitions === 1) {
        interval = FIRST_GOOD_INTERVAL_DAYS;
      } else if (repetitions === 2) {
        interval = SECOND_GOOD_INTERVAL_DAYS;
      } else {
        interval = Math.round(state.interval * currentEase);
      }
      return {
        interval,
        ease: currentEase,
        repetitions,
        failCount: state.failCount,
        dueDate: toIsoDate(addDays(now, interval)),
      };
    }
    case 'easy': {
      const ease = currentEase + 0.15;
      const repetitions = state.repetitions + 1;
      const interval =
        repetitions === 1
          ? FIRST_EASY_INTERVAL_DAYS
          : Math.round(state.interval * ease * 1.3) || FIRST_EASY_INTERVAL_DAYS;
      return {
        interval,
        ease,
        repetitions,
        failCount: state.failCount,
        dueDate: toIsoDate(addDays(now, interval)),
      };
    }
  }
}

/** Sensible initial state for an item that has never been reviewed. */
export function initialSrsState(): SrsState {
  return { interval: 0, ease: DEFAULT_EASE, repetitions: 0, failCount: 0 };
}

/**
 * "Weak item" predicate used by the `weakOnly` review-queue filter
 * (FR-021, contracts/api.md `GET /api/review-queue`). An item counts as weak
 * once it has failed at least twice, or its ease has been driven down near
 * the floor — both signal the user consistently struggles with it.
 */
export function isWeakItem(state: SrsState): boolean {
  return state.failCount >= 2 || state.ease <= MIN_EASE + 0.1;
}
