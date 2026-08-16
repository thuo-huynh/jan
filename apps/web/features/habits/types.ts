/** Row shape for `public.habits` (data-model.md "habits"). */
export type Habit = {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
};

/** Row shape for `public.habit_completions` (data-model.md "habit_completions"). */
export type HabitCompletion = {
  id: string;
  habit_id: string;
  user_id: string;
  completion_date: string;
  created_at: string;
};
