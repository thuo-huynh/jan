import { computeHabitStreak, type IsoDate } from './streak';
import type { Habit, HabitCompletion } from '../types';

export interface TodayHabit {
  habit: Habit;
  completed: boolean;
  streak: number;
}

export interface HabitSummary {
  today: IsoDate;
  todayHabits: TodayHabit[];
  completedToday: number;
  totalHabits: number;
  currentStreak: number;
  longestStreak: number;
  weeklyCompletionRate: number;
}

/** Uses the local calendar rather than UTC so a late-evening completion is not assigned to tomorrow. */
export function localIsoDate(date: Date = new Date()): IsoDate {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function dayBefore(date: Date): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() - 1);
  return copy;
}

function longestRun(dates: IsoDate[]): number {
  const ordered = Array.from(new Set(dates)).sort();
  let longest = 0;
  let current = 0;
  let previous: string | null = null;

  for (const date of ordered) {
    if (previous && localIsoDate(dayBefore(new Date(`${date}T00:00:00`))) === previous) {
      current += 1;
    } else {
      current = 1;
    }
    longest = Math.max(longest, current);
    previous = date;
  }

  return longest;
}

/**
 * Presentation-neutral habit aggregate for the dashboard and habit page.
 * Callers provide a bounded completion window; no component derives streaks
 * or rates from the same records again.
 */
export function summarizeHabits(
  habits: Habit[],
  completions: HabitCompletion[],
  now: Date = new Date(),
): HabitSummary {
  const today = localIsoDate(now);
  const byHabit = new Map<string, IsoDate[]>();
  for (const completion of completions) {
    const dates = byHabit.get(completion.habit_id) ?? [];
    dates.push(completion.completion_date);
    byHabit.set(completion.habit_id, dates);
  }

  const todayHabits = habits.map((habit) => {
    const dates = byHabit.get(habit.id) ?? [];
    return {
      habit,
      completed: dates.includes(today),
      streak: computeHabitStreak(dates, now),
    };
  });

  const startOfWeek = new Date(now);
  startOfWeek.setHours(0, 0, 0, 0);
  startOfWeek.setDate(startOfWeek.getDate() - 6);
  const weekStart = localIsoDate(startOfWeek);
  const weeklyCompletions = completions.filter((completion) => completion.completion_date >= weekStart).length;
  const weekPossible = habits.length * 7;

  const activeDays = new Set(completions.map((completion) => completion.completion_date));
  let currentStreak = 0;
  for (let cursor = new Date(now); activeDays.has(localIsoDate(cursor)); cursor = dayBefore(cursor)) {
    currentStreak += 1;
  }

  return {
    today,
    todayHabits,
    completedToday: todayHabits.filter((habit) => habit.completed).length,
    totalHabits: habits.length,
    currentStreak,
    longestStreak: longestRun(Array.from(activeDays)),
    weeklyCompletionRate: weekPossible === 0 ? 0 : Math.round((weeklyCompletions / weekPossible) * 100),
  };
}
