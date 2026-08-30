'use client';

import { useState } from 'react';
import { Check, Circle, Flame } from 'lucide-react';
import { createClient } from '@/shared/supabase/client';
import type { TodayHabit } from '../lib/summary';

interface TodayHabitListProps {
  initialHabits: TodayHabit[];
  date: string;
}

/** Compact daily interaction for the home page. The complete history remains on the Habits page. */
export function TodayHabitList({ initialHabits, date }: TodayHabitListProps) {
  const [habits, setHabits] = useState(initialHabits);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  async function toggleHabit(id: string) {
    const current = habits.find((entry) => entry.habit.id === id);
    if (!current || pendingIds.has(id)) return;

    setError(null);
    setPendingIds((ids) => new Set(ids).add(id));
    setHabits((entries) => entries.map((entry) => (entry.habit.id === id ? { ...entry, completed: !entry.completed } : entry)));

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { error: mutationError } = user
      ? current.completed
        ? await supabase.from('habit_completions').delete().eq('habit_id', id).eq('completion_date', date)
        : await supabase.from('habit_completions').insert({ habit_id: id, user_id: user.id, completion_date: date })
      : { error: new Error('Bạn cần đăng nhập để cập nhật thói quen.') };

    if (mutationError) {
      setHabits((entries) => entries.map((entry) => (entry.habit.id === id ? { ...entry, completed: current.completed } : entry)));
      setError('Không thể cập nhật thói quen. Vui lòng thử lại.');
    }
    setPendingIds((ids) => {
      const next = new Set(ids);
      next.delete(id);
      return next;
    });
  }

  if (habits.length === 0) {
    return <p className="text-sm text-muted-foreground">Chưa có thói quen nào. Bắt đầu với một việc nhỏ cho hôm nay.</p>;
  }

  return (
    <div className="space-y-2">
      {habits.map(({ habit, completed, streak }) => (
        <button
          key={habit.id}
          type="button"
          aria-pressed={completed}
          disabled={pendingIds.has(habit.id)}
          onClick={() => toggleHabit(habit.id)}
          className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition-colors disabled:opacity-60 ${
            completed ? 'bg-success/10 text-foreground' : 'bg-background hover:bg-muted'
          }`}
        >
          <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${completed ? 'border-success bg-success text-white' : 'border-border text-muted-foreground'}`}>
            {completed ? <Check className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" /> : <Circle className="h-3 w-3" aria-hidden="true" />}
          </span>
          <span className="min-w-0 flex-1 truncate text-sm font-medium">{habit.name}</span>
          {streak > 0 && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Flame className="h-3.5 w-3.5 text-warning" aria-hidden="true" />
              {streak} ngày
            </span>
          )}
        </button>
      ))}
      {error && <p className="error-text">{error}</p>}
    </div>
  );
}
