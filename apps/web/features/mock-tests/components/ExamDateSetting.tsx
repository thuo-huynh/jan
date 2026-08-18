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

function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${dateStr}T00:00:00`);
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function ExamDateSetting({ initialExamDate }: ExamDateSettingProps) {
  const [examDate, setExamDate] = useState(initialExamDate ?? '');
  const [saved, setSaved] = useState(initialExamDate);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // The countdown is meant to be a dashboard-level motivational widget, so
  // once the exam is genuinely close it earns a visually distinct card
  // (accent border/tint) instead of blending in with every other card on
  // the page at the same weight.
  const urgent = saved ? daysUntil(saved) >= 0 && daysUntil(saved) <= 14 : false;

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
    <div className={`card space-y-3 p-4 ${urgent ? 'border-accent/40 bg-accent/5' : ''}`}>
      <h2 className="text-sm font-semibold tracking-tight text-foreground">Exam date</h2>
      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2">
        <div>
          <label className="label-field" htmlFor="exam-date">
            JLPT N2 exam date
          </label>
          <input
            id="exam-date"
            type="date"
            value={examDate}
            onChange={(e) => setExamDate(e.target.value)}
            className="input-field"
          />
        </div>
        <button type="submit" disabled={submitting} className="btn-primary">
          {submitting ? 'Saving…' : 'Save'}
        </button>
      </form>
      {error && <p className="error-text">{error}</p>}

      <ExamCountdownWidget examDate={saved} />
    </div>
  );
}
