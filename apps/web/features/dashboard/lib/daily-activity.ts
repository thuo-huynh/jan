/** Pure daily-review aggregation used by the progress dashboard. */
export interface ReviewLogRow {
  reviewed_at: string;
  vocab_id: string | null;
  grammar_id: string | null;
}

interface DailyGoals {
  dailyGrammarTarget: number;
  dailyVocabTarget: number;
}

interface DailyActivity {
  vocabCount: number;
  grammarCount: number;
  totalCount: number;
  goalMet: boolean;
}

export function aggregateDailyActivity(
  logs: ReviewLogRow[],
  goals: DailyGoals,
): Map<string, DailyActivity> {
  const byDay = new Map<string, { vocabCount: number; grammarCount: number }>();
  for (const log of logs) {
    const day = log.reviewed_at.slice(0, 10);
    const bucket = byDay.get(day) ?? { vocabCount: 0, grammarCount: 0 };
    if (log.vocab_id) bucket.vocabCount += 1;
    if (log.grammar_id) bucket.grammarCount += 1;
    byDay.set(day, bucket);
  }
  return new Map(
    Array.from(byDay.entries()).map(([date, { vocabCount, grammarCount }]) => [
      date,
      {
        vocabCount,
        grammarCount,
        totalCount: vocabCount + grammarCount,
        goalMet: grammarCount >= goals.dailyGrammarTarget && vocabCount >= goals.dailyVocabTarget,
      },
    ]),
  );
}

export function computeStreak(activityByDay: Map<string, DailyActivity>, today: Date = new Date()): number {
  let streak = 0;
  const cursor = new Date(today);
  cursor.setHours(0, 0, 0, 0);
  for (;;) {
    const day = activityByDay.get(cursor.toISOString().slice(0, 10));
    if (!day || (!day.goalMet && day.totalCount < 1)) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
