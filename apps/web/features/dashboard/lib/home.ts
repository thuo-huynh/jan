import { createClient } from '@/shared/supabase/server';
import { summarizeHabits, type HabitSummary } from '@/features/habits/lib/summary';
import type { Habit, HabitCompletion } from '@/features/habits/types';
import { loadDueReviewQueue } from '@/features/vocab-srs/lib/queue';

type ServerSupabaseClient = ReturnType<typeof createClient>;

export interface WeeklyLearningDay {
  date: string;
  label: string;
  minutes: number;
  reviews: number;
}

export interface HomeSummary {
  habits: HabitSummary;
  dueReviews: number;
  grammarMastered: number;
  vocabLearned: number;
  readingMinutes: number;
  listeningMinutes: number;
  weeklyActivity: WeeklyLearningDay[];
}

function localIso(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/**
 * Dashboard-specific server read model. It intentionally loads only the
 * 35-day habit window and 7-day learning window required by the home screen.
 */
export async function loadHomeSummary(
  supabase: ServerSupabaseClient,
  userId: string,
  now: Date = new Date(),
): Promise<HomeSummary> {
  const habitWindowStart = new Date(now);
  habitWindowStart.setDate(habitWindowStart.getDate() - 34);
  const weekStart = new Date(now);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - 6);

  const [habitsResult, completionsResult, dueQueue, reviewsResult, readingResult, listeningResult, grammarResult, vocabResult] =
    await Promise.all([
      supabase.from('habits').select('*').order('created_at', { ascending: true }),
      supabase
        .from('habit_completions')
        .select('*')
        .gte('completion_date', localIso(habitWindowStart))
        .lte('completion_date', localIso(now)),
      loadDueReviewQueue(supabase, userId),
      supabase
        .from('review_logs')
        .select('reviewed_at')
        .eq('user_id', userId)
        .gte('reviewed_at', weekStart.toISOString()),
      supabase
        .from('reading_logs')
        .select('practiced_at, duration_min')
        .eq('user_id', userId)
        .gte('practiced_at', weekStart.toISOString()),
      supabase
        .from('listening_logs')
        .select('practiced_at, duration_min')
        .eq('user_id', userId)
        .gte('practiced_at', weekStart.toISOString()),
      supabase
        .from('user_grammar_status')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'mastered'),
      supabase
        .from('user_vocab_progress')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('srs_repetitions', 1),
    ]);

  const dayMap = new Map<string, WeeklyLearningDay>();
  for (let offset = 0; offset < 7; offset += 1) {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + offset);
    const iso = localIso(date);
    dayMap.set(iso, {
      date: iso,
      label: new Intl.DateTimeFormat('vi-VN', { weekday: 'short' }).format(date),
      minutes: 0,
      reviews: 0,
    });
  }

  const addMinutes = (timestamp: string, minutes: number) => {
    const day = dayMap.get(timestamp.slice(0, 10));
    if (day) day.minutes += minutes;
  };
  for (const row of readingResult.data ?? []) addMinutes(row.practiced_at, row.duration_min);
  for (const row of listeningResult.data ?? []) addMinutes(row.practiced_at, row.duration_min);
  for (const row of reviewsResult.data ?? []) {
    const day = dayMap.get(row.reviewed_at.slice(0, 10));
    if (day) day.reviews += 1;
  }

  return {
    habits: summarizeHabits((habitsResult.data ?? []) as Habit[], (completionsResult.data ?? []) as HabitCompletion[], now),
    dueReviews: dueQueue.length,
    grammarMastered: grammarResult.count ?? 0,
    vocabLearned: vocabResult.count ?? 0,
    readingMinutes: (readingResult.data ?? []).reduce((sum, row) => sum + row.duration_min, 0),
    listeningMinutes: (listeningResult.data ?? []).reduce((sum, row) => sum + row.duration_min, 0),
    weeklyActivity: Array.from(dayMap.values()),
  };
}
