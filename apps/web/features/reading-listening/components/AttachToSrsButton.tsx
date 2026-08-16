'use client';

import { useState, type FormEvent } from 'react';
import { createClient } from '@/shared/supabase/client';
import { attachToSrsSchema } from '@/shared/validation/schemas';

/**
 * "Attach unknown word to SRS" action (T059) — from a reading log entry,
 * creates a custom `vocab_entries` row (user_id = caller) linked back to the
 * log via `source_reading_log_id` (0013_vocab_reading_log_link.sql), so it's
 * blended into the same review queue as any other custom entry (US3).
 * Direct client -> Supabase under RLS, same pattern as VocabEntryForm.tsx —
 * this is plain ownership-scoped CRUD, not SRS scheduling logic.
 */
interface AttachToSrsButtonProps {
  readingLogId: string;
}

export function AttachToSrsButton({ readingLogId }: AttachToSrsButtonProps) {
  const [open, setOpen] = useState(false);
  const [word, setWord] = useState('');
  const [reading, setReading] = useState('');
  const [meaning, setMeaning] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [attachedCount, setAttachedCount] = useState(0);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const parsed = attachToSrsSchema.safeParse({
      word,
      reading: reading || null,
      meaning,
      sourceReadingLogId: readingLogId,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Invalid entry');
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

    const { error: dbError } = await supabase.from('vocab_entries').insert({
      user_id: user.id,
      word: parsed.data.word,
      reading: parsed.data.reading ?? null,
      meaning: parsed.data.meaning,
      source_reading_log_id: parsed.data.sourceReadingLogId,
    });

    setSubmitting(false);

    if (dbError) {
      setError(dbError.message);
      return;
    }

    setWord('');
    setReading('');
    setMeaning('');
    setAttachedCount((n) => n + 1);
    setOpen(false);
  }

  return (
    <div className="inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded-md border border-border px-2 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted"
      >
        {open ? 'Cancel' : '+ Unknown word'}
      </button>
      {attachedCount > 0 && !open && (
        <span className="ml-2 text-xs text-muted-foreground">
          {attachedCount} added to SRS
        </span>
      )}

      {open && (
        <form
          onSubmit={handleSubmit}
          className="mt-2 flex flex-wrap items-end gap-2 rounded-md border border-border bg-card p-3"
        >
          <div>
            <label className="mb-1 block text-xs font-medium text-foreground">Word</label>
            <input
              value={word}
              onChange={(e) => setWord(e.target.value)}
              required
              className="w-28 rounded-md border border-border bg-background px-2 py-1.5 text-sm font-jp text-foreground outline-none transition-colors focus:border-primary"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-foreground">Reading</label>
            <input
              value={reading}
              onChange={(e) => setReading(e.target.value)}
              className="w-24 rounded-md border border-border bg-background px-2 py-1.5 text-sm font-jp text-foreground outline-none transition-colors focus:border-primary"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-foreground">Meaning</label>
            <input
              value={meaning}
              onChange={(e) => setMeaning(e.target.value)}
              required
              className="w-36 rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground outline-none transition-colors focus:border-primary"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90 disabled:opacity-60"
          >
            {submitting ? 'Adding…' : 'Add to SRS'}
          </button>
          {error && <p className="w-full text-xs text-danger">{error}</p>}
        </form>
      )}
    </div>
  );
}
