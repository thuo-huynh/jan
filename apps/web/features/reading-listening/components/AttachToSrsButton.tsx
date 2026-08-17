'use client';

import { useState, type FormEvent } from 'react';
import { Plus, X } from 'lucide-react';
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
      <button type="button" onClick={() => setOpen((v) => !v)} className="btn-outline h-7 px-2 text-xs">
        {open ? (
          <>
            <X className="h-3 w-3" aria-hidden="true" />
            Cancel
          </>
        ) : (
          <>
            <Plus className="h-3 w-3" aria-hidden="true" />
            Unknown word
          </>
        )}
      </button>
      {attachedCount > 0 && !open && (
        <span className="ml-2 text-xs text-muted-foreground">
          {attachedCount} added to SRS
        </span>
      )}

      {open && (
        <form onSubmit={handleSubmit} className="mt-2 flex flex-wrap items-end gap-2 rounded-lg border border-border bg-card p-3">
          <div>
            <label className="label-field text-xs">Word</label>
            <input
              value={word}
              onChange={(e) => setWord(e.target.value)}
              required
              className="input-field h-9 w-28 font-jp"
            />
          </div>
          <div>
            <label className="label-field text-xs">Reading</label>
            <input
              value={reading}
              onChange={(e) => setReading(e.target.value)}
              className="input-field h-9 w-24 font-jp"
            />
          </div>
          <div>
            <label className="label-field text-xs">Meaning</label>
            <input
              value={meaning}
              onChange={(e) => setMeaning(e.target.value)}
              required
              className="input-field h-9 w-36"
            />
          </div>
          <button type="submit" disabled={submitting} className="btn-primary h-9 px-3 text-sm">
            {submitting ? 'Adding…' : 'Add to SRS'}
          </button>
          {error && <p className="error-text w-full">{error}</p>}
        </form>
      )}
    </div>
  );
}
