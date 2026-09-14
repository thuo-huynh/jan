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

export type DailyTaskPriority = 'low' | 'normal' | 'high';

export interface TodayTask {
  id: string;
  title: string;
  dueDate: string | null;
  estimatedMinutes: number | null;
  priority: DailyTaskPriority;
}

export interface DailyReview {
  note: string;
  tomorrowTaskId: string | null;
}

export interface HomeSummary {
  habits: HabitSummary;
  dueReviews: number;
  grammarMastered: number;
  vocabLearned: number;
  readingMinutes: number;
  listeningMinutes: number;
  weeklyActivity: WeeklyLearningDay[];
  daily: {
    tasks: TodayTask[];
    overdueCount: number;
    todayCount: number;
    activeFocusTaskId: string | null;
    review: DailyReview | null;
  };
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
  now: Date = new Date()
): Promise<HomeSummary> {
  const habitWindowStart = new Date(now);
  habitWindowStart.setDate(habitWindowStart.getDate() - 34);
  const weekStart = new Date(now);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - 6);

  const [
    habitsResult,
    completionsResult,
    dueQueue,
    reviewsResult,
    readingResult,
    listeningResult,
    grammarResult,
    vocabResult,
  ] = await Promise.all([
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

  const today = localIso(now);
  const dailyBoardResult = await supabase
    .from('boards')
    .select('id')
    .eq('user_id', userId)
    .eq('is_daily', true)
    .maybeSingle();

  const dailyBoardId = dailyBoardResult.data?.id;
  const dailyTasksResult = dailyBoardId
    ? await supabase
        .from('tasks')
        .select('id, title, due_date, estimated_minutes, priority')
        .eq('board_id', dailyBoardId)
        .order('updated_at', { ascending: false })
        .limit(30)
    : { data: [] };
  const dailyTaskIds = (dailyTasksResult.data ?? []).map((task) => task.id);
  const [focusBlocksResult, reviewResult] = await Promise.all([
    dailyTaskIds.length > 0
      ? supabase
          .from('focus_blocks')
          .select('task_id')
          .in('task_id', dailyTaskIds)
          .eq('status', 'active')
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from('daily_reviews')
      .select('note, tomorrow_task_id')
      .eq('user_id', userId)
      .eq('review_date', today)
      .maybeSingle(),
  ]);
  const todayTasks = (dailyTasksResult.data ?? []).map((task) => ({
    id: task.id,
    title: task.title,
    dueDate: task.due_date,
    estimatedMinutes: task.estimated_minutes,
    priority: (task.priority ?? 'normal') as DailyTaskPriority,
  }));

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
    habits: summarizeHabits(
      (habitsResult.data ?? []) as Habit[],
      (completionsResult.data ?? []) as HabitCompletion[],
      now
    ),
    dueReviews: dueQueue.length,
    grammarMastered: grammarResult.count ?? 0,
    vocabLearned: vocabResult.count ?? 0,
    readingMinutes: (readingResult.data ?? []).reduce((sum, row) => sum + row.duration_min, 0),
    listeningMinutes: (listeningResult.data ?? []).reduce((sum, row) => sum + row.duration_min, 0),
    weeklyActivity: Array.from(dayMap.values()),
    daily: {
      tasks: todayTasks,
      overdueCount: todayTasks.filter((task) => task.dueDate && task.dueDate < today).length,
      todayCount: todayTasks.filter((task) => task.dueDate === today).length,
      activeFocusTaskId: focusBlocksResult.data?.task_id ?? null,
      review: reviewResult.data
        ? { note: reviewResult.data.note, tomorrowTaskId: reviewResult.data.tomorrow_task_id }
        : null,
    },
  };
}
