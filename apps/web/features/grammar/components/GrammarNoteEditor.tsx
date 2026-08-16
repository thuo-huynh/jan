'use client';

import { useState } from 'react';
import { createClient } from '@/shared/supabase/client';
import { grammarNoteSchema } from '@/shared/validation/schemas';
import { GrammarMarkdown } from './GrammarMarkdown';

interface GrammarNoteEditorProps {
  grammarPointId: string;
  userId: string;
  initialNote: string | null;
  /** Bubbles the saved value up so the parent list/card can keep its copy in sync. */
  onSaved: (notesUser: string | null) => void;
}

/**
 * Personal markdown note/mnemonic editor for a single grammar point (T044).
 * Mutates `user_grammar_status` directly from the browser client — RLS
 * (owner-only via `user_id`) is the authorization boundary, per the
 * project's no-route-handler convention for this kind of CRUD. Upserting
 * only `{user_id, grammar_point_id, notes_user}` lazily creates the row on
 * first save (data-model.md) without disturbing `status`/SRS columns that
 * may already exist on the row (PostgREST upsert only touches submitted
 * columns on conflict).
 */
export function GrammarNoteEditor({
  grammarPointId,
  userId,
  initialNote,
  onSaved,
}: GrammarNoteEditorProps) {
  const [draft, setDraft] = useState(initialNote ?? '');
  const [mode, setMode] = useState<'edit' | 'preview'>('edit');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  const dirty = draft !== (initialNote ?? '');

  async function handleSave() {
    const parsed = grammarNoteSchema.safeParse({
      grammarPointId,
      notesUser: draft.trim().length > 0 ? draft : null,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Invalid note.');
      return;
    }

    setSaving(true);
    setError(null);
    const supabase = createClient();
    const { error: upsertError } = await supabase.from('user_grammar_status').upsert(
      {
        user_id: userId,
        grammar_point_id: grammarPointId,
        notes_user: parsed.data.notesUser,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,grammar_point_id' },
    );
    setSaving(false);

    if (upsertError) {
      setError('Could not save note. Please try again.');
      return;
    }

    setJustSaved(true);
    onSaved(parsed.data.notesUser ?? null);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">
          Personal note (markdown, visible only to you)
        </span>
        <div className="flex gap-2 text-xs">
          <button
            type="button"
            onClick={() => setMode('edit')}
            className={mode === 'edit' ? 'font-semibold text-foreground' : 'text-muted-foreground'}
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => setMode('preview')}
            className={mode === 'preview' ? 'font-semibold text-foreground' : 'text-muted-foreground'}
          >
            Preview
          </button>
        </div>
      </div>

      {mode === 'edit' ? (
        <textarea
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            setJustSaved(false);
          }}
          rows={4}
          maxLength={10_000}
          placeholder="Write a mnemonic or usage note in markdown..."
          className="w-full rounded-md border border-border bg-background p-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
      ) : (
        <div className="min-h-24 rounded-md border border-border bg-background p-2">
          {draft.trim() ? (
            <GrammarMarkdown>{draft}</GrammarMarkdown>
          ) : (
            <span className="text-sm text-muted-foreground">Nothing to preview yet.</span>
          )}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !dirty}
          className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save note'}
        </button>
        {error && <span className="text-xs text-danger">{error}</span>}
        {!error && justSaved && !dirty && (
          <span className="text-xs text-success">Saved</span>
        )}
      </div>
    </div>
  );
}
