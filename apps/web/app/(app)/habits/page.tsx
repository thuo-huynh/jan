import { redirect } from 'next/navigation';
import { createClient, getAuthedUser } from '@/shared/supabase/server';
import { HabitGridManager } from '@/features/habits/components/HabitGridManager';
import { getMonthDays, shiftIsoDate } from '@/features/habits/lib/calendar';
import type { Habit, HabitCompletion } from '@/features/habits/types';

/**
 * Habit grid page (T006) — month-view grid, habits as rows / days as
 * columns (US1). Server Component fetches the signed-in user's habits plus
 * the viewed month's completions; the grid/tick interactivity and month
 * navigation (T013) live in the client HabitGridManager.
 */
interface HabitsPageProps {
  searchParams: { year?: string; month?: string };
}

export default async function HabitsPage({ searchParams }: HabitsPageProps) {
  const supabase = createClient();
  const user = await getAuthedUser();

  if (!user) {
    redirect('/login');
  }

  const now = new Date();
  const year = Number(searchParams.year) || now.getFullYear();
  const month = Number(searchParams.month) || now.getMonth() + 1; // 1-12

  const days = getMonthDays(year, month);
  const monthStart = days[0];
  const monthEnd = days[days.length - 1];
  const firstWeekLength = days.length % 7 || 7;
  const calendarStart = shiftIsoDate(monthStart, -(7 - firstWeekLength));

  const [{ data: habits, error: habitsError }, { data: completions }] = await Promise.all([
    supabase.from('habits').select('*').order('created_at', { ascending: true }),
    supabase
      .from('habit_completions')
      .select('*')
      .gte('completion_date', calendarStart)
      .lte('completion_date', monthEnd),
  ]);

  return (
    <div>
      {habitsError ? (
        <p className="bg-danger/10 rounded-lg border border-danger px-3 py-2 text-sm text-danger">
          Không tải được thói quen: {habitsError.message}
        </p>
      ) : (
        <HabitGridManager
          year={year}
          month={month}
          days={days}
          initialHabits={(habits ?? []) as Habit[]}
          initialCompletions={(completions ?? []) as HabitCompletion[]}
        />
      )}
    </div>
  );
}
