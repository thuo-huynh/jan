'use client';

import { useState, type FormEvent } from 'react';
import { createClient } from '@/shared/supabase/client';
import { vocabEntrySchema, type VocabEntryInput } from '@/shared/validation/schemas';

/**
 * Custom vocab/kanji entry form (T052) — used both to create a new custom
 * entry and to edit an existing one (CustomVocabManager.tsx toggles `mode`).
 *
 * This is plain CRUD against `vocab_entries`, not SRS-sensitive scheduling,
 * so — per this project's architecture (everything except SRS resolution
 * goes direct client -> Supabase under RLS) — it talks to Supabase directly
 * via the browser client rather than a route handler. RLS's
 * `vocab_entries_insert_own`/`_update_own` policies (0012_rls_reference_data.sql)
 * already enforce `user_id = auth.uid()`, so a malicious client can't write
 * a custom entry under someone else's id or touch a global reference row.
 */

export interface CustomVocabEntry {
  id: string;
  word: string;
  reading: string | null;
  meaning: string;
  example: string | null;
  jlpt_level: string | null;
  is_kanji: boolean;
}

interface VocabEntryFormProps {
  mode: 'create' | 'edit';
  entryId?: string;
  initialValues?: Partial<VocabEntryInput>;
  onSaved: (entry: CustomVocabEntry) => void;
  onCancel?: () => void;
}

export function VocabEntryForm({
  mode,
  entryId,
  initialValues,
  onSaved,
  onCancel,
}: VocabEntryFormProps) {
  const [word, setWord] = useState(initialValues?.word ?? '');
  const [reading, setReading] = useState(initialValues?.reading ?? '');
  const [meaning, setMeaning] = useState(initialValues?.meaning ?? '');
  const [example, setExample] = useState(initialValues?.example ?? '');
  const [jlptLevel, setJlptLevel] = useState(initialValues?.jlptLevel ?? 'N2');
  const [isKanji, setIsKanji] = useState(initialValues?.isKanji ?? false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const parsed = vocabEntrySchema.safeParse({
      word,
      reading: reading || null,
      meaning,
      example: example || null,
      jlptLevel: jlptLevel || null,
      isKanji,
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

    const payload = {
      word: parsed.data.word,
      reading: parsed.data.reading ?? null,
      meaning: parsed.data.meaning,
      example: parsed.data.example ?? null,
      jlpt_level: parsed.data.jlptLevel ?? null,
      is_kanji: parsed.data.isKanji ?? false,
    };

    const { data, error: dbError } =
      mode === 'create'
        ? await supabase
            .from('vocab_entries')
            .insert({ ...payload, user_id: user.id })
            .select('id, word, reading, meaning, example, jlpt_level, is_kanji')
            .single()
        : await supabase
            .from('vocab_entries')
            .update(payload)
            .eq('id', entryId!)
            .eq('user_id', user.id)
            .select('id, word, reading, meaning, example, jlpt_level, is_kanji')
            .single();

    setSubmitting(false);

    if (dbError || !data) {
      setError(dbError?.message ?? 'Failed to save entry');
      return;
    }

    onSaved(data as CustomVocabEntry);
    if (mode === 'create') {
      setWord('');
      setReading('');
      setMeaning('');
      setExample('');
      setIsKanji(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-3 p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="label-field" htmlFor="vocab-word">
            Word
          </label>
          <input
            id="vocab-word"
            value={word}
            onChange={(e) => setWord(e.target.value)}
            required
            className="input-field font-jp"
          />
        </div>
        <div>
          <label className="label-field" htmlFor="vocab-reading">
            Reading
          </label>
          <input
            id="vocab-reading"
            value={reading ?? ''}
            onChange={(e) => setReading(e.target.value)}
            className="input-field font-jp"
          />
        </div>
      </div>
      <div>
        <label className="label-field" htmlFor="vocab-meaning">
          Meaning
        </label>
        <input
          id="vocab-meaning"
          value={meaning}
          onChange={(e) => setMeaning(e.target.value)}
          required
          className="input-field"
        />
      </div>
      <div>
        <label className="label-field" htmlFor="vocab-example">
          Example sentence
        </label>
        <textarea
          id="vocab-example"
          value={example ?? ''}
          onChange={(e) => setExample(e.target.value)}
          rows={2}
          className="textarea-field font-jp"
        />
      </div>
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <label className="label-field" htmlFor="vocab-level">
            JLPT level
          </label>
          <input
            id="vocab-level"
            value={jlptLevel ?? ''}
            onChange={(e) => setJlptLevel(e.target.value)}
            className="input-field w-28"
          />
        </div>
        <label className="flex items-center gap-2 pb-2 text-sm text-foreground">
          <input
            type="checkbox"
            checked={isKanji}
            onChange={(e) => setIsKanji(e.target.checked)}
            className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
          />
          This is a kanji entry
        </label>
      </div>

      {error && <p className="error-text">{error}</p>}

      <div className="flex gap-2">
        <button type="submit" disabled={submitting} className="btn-primary">
          {submitting ? 'Saving…' : mode === 'create' ? 'Add word' : 'Save changes'}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="btn-outline">
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
