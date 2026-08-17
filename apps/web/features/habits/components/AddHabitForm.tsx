'use client';

import { useState, type FormEvent } from 'react';
import { Plus } from 'lucide-react';
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
      <button type="button" onClick={() => setOpen(true)} className="btn-primary h-9 px-3 text-sm">
        <Plus className="h-4 w-4" aria-hidden="true" />
        Add habit
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
          className="input-field h-9 w-64"
        />
        {error && <p className="error-text">{error}</p>}
      </div>
      <button type="submit" disabled={submitting} className="btn-primary h-9 px-3 text-sm">
        {submitting ? 'Adding…' : 'Add'}
      </button>
      <button type="button" onClick={() => setOpen(false)} className="btn-outline h-9 px-3 text-sm">
        Cancel
      </button>
    </form>
  );
}
