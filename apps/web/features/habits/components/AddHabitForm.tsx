'use client';

import { useState, type FormEvent } from 'react';
import { createClient } from '@/shared/supabase/client';
import { habitSchema } from '@/shared/validation/schemas';
import type { Habit } from '../types';

/**
 * Add-habit form/button (T011). Direct client -> Supabase under RLS
 * (habits_insert_own, 0016_rls_habits.sql), same pattern as every other
 * simple owner-scoped create form in this codebase (VocabEntryForm, etc.).
 */
interface AddHabitFormProps {
  onCreated: (habit: Habit) => void;
}

export function AddHabitForm({ onCreated }: AddHabitFormProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const parsed = habitSchema.safeParse({ name });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Invalid habit name');
      return;
    }

    setSubmitting(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSubmitting(false);
      setError('You must be signed in.');
      return;
    }

    const { data, error: dbError } = await supabase
      .from('habits')
      .insert({ user_id: user.id, name: parsed.data.name })
      .select('*')
      .single();

    setSubmitting(false);

    if (dbError || !data) {
      setError(dbError?.message ?? 'Failed to add habit');
      return;
    }

    onCreated(data as Habit);
    setName('');
    setOpen(false);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90"
      >
        + Add habit
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-start gap-2">
      <div>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Read 1 news article"
          autoFocus
          required
          className="w-64 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary"
        />
        {error && <p className="mt-1 text-xs text-danger">{error}</p>}
      </div>
      <button
        type="submit"
        disabled={submitting}
        className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90 disabled:opacity-60"
      >
        {submitting ? 'Adding…' : 'Add'}
      </button>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
      >
        Cancel
      </button>
    </form>
  );
}
