/**
 * Daily-activity aggregation (T071) + streak calculation (T074) from
 * `review_logs`, grouped by local calendar day per user (research.md §10).
 * Pure functions — no I/O — same architecture reasoning as shared/srs/sm2.ts:
 * testable in isolation, safe to call from either a Server Component
 * (dashboard/heatmap initial render) or a client re-fetch.
 */

export interface ReviewLogRow {
  reviewed_at: string;
  vocab_id: string | null;
  grammar_id: string | null;
}

export interface DailyGoals {
  dailyGrammarTarget: number;
  dailyVocabTarget: number;
}

export interface DailyActivity {
  /** `YYYY-MM-DD` */
  date: string;
  vocabCount: number;
  grammarCount: number;
  totalCount: number;
  /** Both the grammar-review and vocab-review targets were met this day (FR-033/034). */
  goalMet: boolean;
}

function localDay(isoTimestamp: string): string {
  return isoTimestamp.slice(0, 10);
}

/** Groups review_logs by local day and computes each day's goal-met state. */
export function aggregateDailyActivity(
  logs: ReviewLogRow[],
  goals: DailyGoals,
): Map<string, DailyActivity> {
  const byDay = new Map<string, { vocabCount: number; grammarCount: number }>();

  for (const log of logs) {
    const day = localDay(log.reviewed_at);
    const bucket = byDay.get(day) ?? { vocabCount: 0, grammarCount: 0 };
    if (log.vocab_id) bucket.vocabCount += 1;
    if (log.grammar_id) bucket.grammarCount += 1;
    byDay.set(day, bucket);
  }

  const result = new Map<string, DailyActivity>();
  for (const [date, { vocabCount, grammarCount }] of Array.from(byDay.entries())) {
    const goalMet =
      grammarCount >= goals.dailyGrammarTarget && vocabCount >= goals.dailyVocabTarget;
    result.set(date, { date, vocabCount, grammarCount, totalCount: vocabCount + grammarCount, goalMet });
  }
  return result;
}

/** Produces a dense `{date, ...}[]` for the trailing `days` (inclusive of today), filling gaps with zero activity. */
export function fillTrailingDays(
  activityByDay: Map<string, DailyActivity>,
  days: number,
  today: Date = new Date(),
): DailyActivity[] {
  const out: DailyActivity[] = [];
  const cursor = new Date(today);
  cursor.setHours(0, 0, 0, 0);
  cursor.setDate(cursor.getDate() - (days - 1));

  for (let i = 0; i < days; i++) {
    const date = cursor.toISOString().slice(0, 10);
    out.push(
      activityByDay.get(date) ?? {
        date,
        vocabCount: 0,
        grammarCount: 0,
        totalCount: 0,
        goalMet: false,
      },
    );
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}

/**
 * Consecutive-day streak counting backward from today. A day counts toward
 * the streak if its goal was met OR it had at least one review (US7
 * acceptance scenario 3: "consistent with User Story 3's SRS streak
 * behavior", which counts any day with >=1 review — see
 * computeCurrentStreak in app/api/reviews/route.ts). Resets to 0 at the
 * first gap.
 */
export function computeStreak(activityByDay: Map<string, DailyActivity>, today: Date = new Date()): number {
  let streak = 0;
  const cursor = new Date(today);
  cursor.setHours(0, 0, 0, 0);

  for (;;) {
    const date = cursor.toISOString().slice(0, 10);
    const day = activityByDay.get(date);
    const countsTowardStreak = Boolean(day && (day.goalMet || day.totalCount >= 1));
    if (!countsTowardStreak) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
