'use client';

import { useState } from 'react';
import { Plus, X, Pencil, Trash2 } from 'lucide-react';
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
        <h2 className="text-lg font-semibold tracking-tight text-foreground">Your custom entries</h2>
        <button type="button" onClick={() => setAdding((v) => !v)} className="btn-primary h-9 px-3 text-sm">
          {adding ? (
            <>
              <X className="h-4 w-4" aria-hidden="true" />
              Close
            </>
          ) : (
            <>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add word
            </>
          )}
        </button>
      </div>

      {adding && (
        <VocabEntryForm mode="create" onSaved={handleCreated} onCancel={() => setAdding(false)} />
      )}

      {entries.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border p-8 text-center">
          <p className="max-w-xs text-sm text-muted-foreground">
            No custom entries yet — add your own N2 vocab or kanji to blend into the review queue.
          </p>
        </div>
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
              <li key={entry.id} className="card flex items-center justify-between gap-4 p-3">
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
                  <span className="badge-neutral">{entry.is_kanji ? 'kanji' : 'vocab'} · custom</span>
                  <button
                    type="button"
                    onClick={() => setEditingId(entry.id)}
                    aria-label={`Edit ${entry.word}`}
                    className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(entry.id)}
                    aria-label={`Delete ${entry.word}`}
                    className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-danger/10 hover:text-danger"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
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
