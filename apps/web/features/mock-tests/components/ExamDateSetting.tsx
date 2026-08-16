'use client';

import { useState, type FormEvent } from 'react';
import { createClient } from '@/shared/supabase/client';
import { examDateSchema } from '@/shared/validation/schemas';
import { ExamCountdownWidget } from './ExamCountdownWidget';

/**
 * Exam date setting control (T063) — persisted on `study_goals.exam_date`
 * (0014_study_goals_exam_date.sql), one row per user (upsert, same lazy
 * pattern as user_grammar_status). Renders the countdown widget (T064)
 * inline so setting a date immediately shows its effect.
 */
interface ExamDateSettingProps {
  initialExamDate: string | null;
}

export function ExamDateSetting({ initialExamDate }: ExamDateSettingProps) {
  const [examDate, setExamDate] = useState(initialExamDate ?? '');
  const [saved, setSaved] = useState(initialExamDate);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const parsed = examDateSchema.safeParse({ examDate: examDate || null });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Invalid date');
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

    const { error: dbError } = await supabase
      .from('study_goals')
      .upsert(
        { user_id: user.id, exam_date: parsed.data.examDate },
        { onConflict: 'user_id' },
      );

    setSubmitting(false);

    if (dbError) {
      setError(dbError.message);
      return;
    }

    setSaved(parsed.data.examDate ?? null);
  }

  return (
    <div className="space-y-3 rounded-lg border border-border bg-card p-4">
      <h2 className="text-sm font-semibold text-foreground">Exam date</h2>
      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-foreground" htmlFor="exam-date">
            JLPT N2 exam date
          </label>
          <input
            id="exam-date"
            type="date"
            value={examDate}
            onChange={(e) => setExamDate(e.target.value)}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary"
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90 disabled:opacity-60"
        >
          {submitting ? 'Saving…' : 'Save'}
        </button>
      </form>
      {error && <p className="text-sm text-danger">{error}</p>}

      <ExamCountdownWidget examDate={saved} />
    </div>
  );
}
