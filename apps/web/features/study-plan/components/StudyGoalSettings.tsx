'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/shared/supabase/client';
import { z } from 'zod';

/**
 * Daily goal settings form (T070) — grammar target + vocab target, writing
 * to `study_goals` (one row per user, upsert, same lazy pattern as
 * ExamDateSetting.tsx). FR-033.
 */
const goalSchema = z.object({
  dailyGrammarTarget: z.number().int().min(0).max(1000),
  dailyVocabTarget: z.number().int().min(0).max(1000),
});

interface StudyGoalSettingsProps {
  initialGrammarTarget: number;
  initialVocabTarget: number;
  onSaved?: (grammarTarget: number, vocabTarget: number) => void;
}

export function StudyGoalSettings({
  initialGrammarTarget,
  initialVocabTarget,
  onSaved,
}: StudyGoalSettingsProps) {
  const router = useRouter();
  const [grammarTarget, setGrammarTarget] = useState(String(initialGrammarTarget));
  const [vocabTarget, setVocabTarget] = useState(String(initialVocabTarget));
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaved(false);

    const parsed = goalSchema.safeParse({
      dailyGrammarTarget: Number(grammarTarget),
      dailyVocabTarget: Number(vocabTarget),
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Invalid target');
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

    const { error: dbError } = await supabase.from('study_goals').upsert(
      {
        user_id: user.id,
        daily_grammar_target: parsed.data.dailyGrammarTarget,
        daily_vocab_target: parsed.data.dailyVocabTarget,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    );

    setSubmitting(false);

    if (dbError) {
      setError(dbError.message);
      return;
    }

    setSaved(true);
    onSaved?.(parsed.data.dailyGrammarTarget, parsed.data.dailyVocabTarget);
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-card p-4"
    >
      <div>
        <label className="mb-1 block text-sm font-medium text-foreground" htmlFor="goal-grammar">
          Daily grammar reviews
        </label>
        <input
          id="goal-grammar"
          type="number"
          min={0}
          value={grammarTarget}
          onChange={(e) => setGrammarTarget(e.target.value)}
          className="w-28 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-foreground" htmlFor="goal-vocab">
          Daily vocab/kanji reviews
        </label>
        <input
          id="goal-vocab"
          type="number"
          min={0}
          value={vocabTarget}
          onChange={(e) => setVocabTarget(e.target.value)}
          className="w-28 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary"
        />
      </div>
      <button
        type="submit"
        disabled={submitting}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90 disabled:opacity-60"
      >
        {submitting ? 'Saving…' : 'Save goal'}
      </button>
      {saved && <span className="text-sm text-success">Saved.</span>}
      {error && <span className="text-sm text-danger">{error}</span>}
    </form>
  );
}
