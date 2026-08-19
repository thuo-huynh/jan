'use client';

import { useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { createClient } from '@/shared/supabase/client';
import { parseBulkVocabInput } from '../lib/bulkParse';
import type { CustomVocabEntry } from './VocabEntryForm';

const PLACEHOLDER = `食べる\tたべる\tto eat
飲む\tのむ\tto drink
走る - to run`;

interface BulkVocabAddFormProps {
  onImported: (entries: CustomVocabEntry[]) => void;
  onCancel: () => void;
}

/**
 * Quizlet-style "paste many words at once" alternative to the one-at-a-time
 * VocabEntryForm — parses live as the user types/pastes (parseBulkVocabInput)
 * so they see exactly what will be created (and what couldn't be parsed)
 * before committing a single insert.
 */
export function BulkVocabAddForm({ onImported, onCancel }: BulkVocabAddFormProps) {
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { entries, errors } = useMemo(() => parseBulkVocabInput(text), [text]);

  async function handleImport() {
    if (entries.length === 0) return;
    setSubmitting(true);
    setSubmitError(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSubmitting(false);
      setSubmitError('You must be signed in.');
      return;
    }

    const { data, error } = await supabase
      .from('vocab_entries')
      .insert(entries.map((e) => ({ ...e, user_id: user.id, is_kanji: false })))
      .select('id, word, reading, meaning, example, jlpt_level, is_kanji');

    setSubmitting(false);
    if (error || !data) {
      setSubmitError(error?.message ?? 'Failed to import words');
      return;
    }

    onImported(data as CustomVocabEntry[]);
    setText('');
  }

  return (
    <div className="card space-y-3 p-4">
      <div>
        <label className="label-field" htmlFor="bulk-vocab-input">
          Paste your words
        </label>
        <textarea
          id="bulk-vocab-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={8}
          placeholder={PLACEHOLDER}
          className="textarea-field font-jp"
        />
        <p className="helper-text">
          One word per line: <span className="font-jp">word</span> + reading (optional) + meaning,
          separated by a tab, or <span className="font-jp">word</span> - meaning.
        </p>
      </div>

      {(entries.length > 0 || errors.length > 0) && (
        <div className="space-y-2 rounded-lg border border-border p-3">
          {entries.length > 0 && (
            <div className="flex items-center gap-1.5 text-sm text-success">
              <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
              {entries.length} {entries.length === 1 ? 'word' : 'words'} ready to import
            </div>
          )}
          {entries.length > 0 && (
            <ul className="max-h-40 space-y-1 overflow-y-auto text-sm">
              {entries.map((e, i) => (
                <li key={i} className="flex items-baseline gap-2 truncate text-foreground">
                  <span className="font-jp font-medium">{e.word}</span>
                  {e.reading && <span className="font-jp text-xs text-muted-foreground">{e.reading}</span>}
                  <span className="truncate text-muted-foreground">— {e.meaning}</span>
                </li>
              ))}
            </ul>
          )}
          {errors.length > 0 && (
            <div className="space-y-1 border-t border-border pt-2">
              <div className="flex items-center gap-1.5 text-sm text-danger">
                <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                {errors.length} {errors.length === 1 ? 'line' : 'lines'} couldn&apos;t be parsed
              </div>
              <ul className="max-h-24 space-y-0.5 overflow-y-auto text-xs text-muted-foreground">
                {errors.map((e) => (
                  <li key={e.line} className="truncate">
                    Line {e.line}: &quot;{e.raw}&quot; — {e.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {submitError && <p className="error-text">{submitError}</p>}

      <div className="flex gap-2">
        <button
          type="button"
          disabled={submitting || entries.length === 0}
          onClick={handleImport}
          className="btn-primary"
        >
          {submitting
            ? 'Importing…'
            : entries.length > 0
              ? `Import ${entries.length} ${entries.length === 1 ? 'word' : 'words'}`
              : 'Import words'}
        </button>
        <button type="button" onClick={onCancel} className="btn-outline">
          Cancel
        </button>
      </div>
    </div>
  );
}
