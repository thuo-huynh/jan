'use client';

import { useState } from 'react';
import { createClient } from '@/shared/supabase/client';
import { VocabEntryForm, type CustomVocabEntry } from './VocabEntryForm';

export type { CustomVocabEntry } from './VocabEntryForm';

/**
 * Deck management surface for the caller's own custom vocab/kanji entries
 * (T051/T052) — add, edit, delete. Global reference-deck browsing is handled
 * separately (read-only, server-rendered) in the vocab page itself.
 */
interface CustomVocabManagerProps {
  initialEntries: CustomVocabEntry[];
}

export function CustomVocabManager({ initialEntries }: CustomVocabManagerProps) {
  const [entries, setEntries] = useState(initialEntries);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  function handleCreated(entry: CustomVocabEntry) {
    setEntries((prev) => [entry, ...prev]);
    setAdding(false);
  }

  function handleUpdated(entry: CustomVocabEntry) {
    setEntries((prev) => prev.map((e) => (e.id === entry.id ? entry : e)));
    setEditingId(null);
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this custom entry? Its review history will be removed too.')) return;
    const supabase = createClient();
    const { error } = await supabase.from('vocab_entries').delete().eq('id', id);
    if (!error) {
      setEntries((prev) => prev.filter((e) => e.id !== id));
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Your custom entries</h2>
        <button
          type="button"
          onClick={() => setAdding((v) => !v)}
          className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90"
        >
          {adding ? 'Close' : 'Add word'}
        </button>
      </div>

      {adding && (
        <VocabEntryForm mode="create" onSaved={handleCreated} onCancel={() => setAdding(false)} />
      )}

      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No custom entries yet — add your own N2 vocab or kanji to blend into the review queue.
        </p>
      ) : (
        <ul className="space-y-2">
          {entries.map((entry) =>
            editingId === entry.id ? (
              <li key={entry.id}>
                <VocabEntryForm
                  mode="edit"
                  entryId={entry.id}
                  initialValues={{
                    word: entry.word,
                    reading: entry.reading,
                    meaning: entry.meaning,
                    example: entry.example,
                    jlptLevel: entry.jlpt_level,
                    isKanji: entry.is_kanji,
                  }}
                  onSaved={handleUpdated}
                  onCancel={() => setEditingId(null)}
                />
              </li>
            ) : (
              <li
                key={entry.id}
                className="flex items-center justify-between gap-4 rounded-lg border border-border bg-card p-3"
              >
                <div>
                  <p className="font-jp text-base text-foreground">
                    {entry.word}
                    {entry.reading && (
                      <span className="ml-2 text-sm text-muted-foreground">{entry.reading}</span>
                    )}
                  </p>
                  <p className="text-sm text-muted-foreground">{entry.meaning}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    {entry.is_kanji ? 'kanji' : 'vocab'} · custom
                  </span>
                  <button
                    type="button"
                    onClick={() => setEditingId(entry.id)}
                    className="rounded-md border border-border px-2 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(entry.id)}
                    className="rounded-md border border-border px-2 py-1 text-xs font-medium text-danger transition-colors hover:bg-muted"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ),
          )}
        </ul>
      )}
    </div>
  );
}
