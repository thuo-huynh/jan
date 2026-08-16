'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { createClient } from '@/shared/supabase/client';
import { mistakeSchema } from '@/shared/validation/schemas';
import type { GrammarLinkOption, MistakeEntry, VocabLinkOption } from '../types';

/**
 * Manual-entry mistake form (T066) with a vocab/grammar link picker.
 * Mock-test-originated entries (`source = 'mock_test'`) aren't created here —
 * no mock-test-to-mistake pipeline exists yet (out of scope for this story);
 * this form always writes `source = 'manual'` (US6 acceptance scenario 1).
 * Same searchable-combobox pattern as NoteLinkPicker.tsx.
 */
function LinkSelect<T extends { id: string }>({
  label,
  options,
  selectedId,
  renderLabel,
  onSelect,
  placeholder,
}: {
  label: string;
  options: T[];
  selectedId: string | null;
  renderLabel: (option: T) => string;
  onSelect: (id: string | null) => void;
  placeholder: string;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  const selected = options.find((o) => o.id === selectedId) ?? null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options.slice(0, 20);
    return options.filter((o) => renderLabel(o).toLowerCase().includes(q)).slice(0, 20);
  }, [query, options, renderLabel]);

  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-muted-foreground">{label}</label>
      {selected ? (
        <div className="flex items-center justify-between gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-sm">
          <span className="line-clamp-1 text-foreground">{renderLabel(selected)}</span>
          <button
            type="button"
            onClick={() => onSelect(null)}
            className="shrink-0 text-xs font-medium text-muted-foreground hover:text-danger"
          >
            Unlink
          </button>
        </div>
      ) : (
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            placeholder={placeholder}
            className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
          {open && (
            <ul className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-md border border-border bg-card py-1 text-sm shadow-md">
              {filtered.length === 0 && (
                <li className="px-3 py-1.5 text-muted-foreground">No matches</li>
              )}
              {filtered.map((option) => (
                <li key={option.id}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      onSelect(option.id);
                      setQuery('');
                      setOpen(false);
                    }}
                    className="block w-full px-3 py-1.5 text-left text-foreground hover:bg-muted"
                  >
                    {renderLabel(option)}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

interface MistakeEntryFormProps {
  vocabOptions: VocabLinkOption[];
  grammarOptions: GrammarLinkOption[];
  onCreated: (entry: MistakeEntry) => void;
  onCancel: () => void;
}

export function MistakeEntryForm({
  vocabOptions,
  grammarOptions,
  onCreated,
  onCancel,
}: MistakeEntryFormProps) {
  const [content, setContent] = useState('');
  const [linkedVocabId, setLinkedVocabId] = useState<string | null>(null);
  const [linkedGrammarId, setLinkedGrammarId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const parsed = mistakeSchema.safeParse({ content, linkedVocabId, linkedGrammarId });
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

    const { data, error: dbError } = await supabase
      .from('mistake_notebook')
      .insert({
        user_id: user.id,
        source: 'manual',
        content: parsed.data.content,
        linked_vocab_id: parsed.data.linkedVocabId ?? null,
        linked_grammar_id: parsed.data.linkedGrammarId ?? null,
      })
      .select('*')
      .single();

    setSubmitting(false);

    if (dbError || !data) {
      setError(dbError?.message ?? 'Failed to save mistake');
      return;
    }

    onCreated(data as MistakeEntry);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 rounded-lg border border-border bg-card p-4"
    >
      <div>
        <label className="mb-1 block text-sm font-medium text-foreground" htmlFor="mistake-content">
          What went wrong?
        </label>
        <textarea
          id="mistake-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={3}
          required
          placeholder="e.g. Mixed up 〜わけではない and 〜わけがない in a fill-in-the-blank"
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary"
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <LinkSelect
          label="Linked vocab / kanji (optional)"
          options={vocabOptions}
          selectedId={linkedVocabId}
          renderLabel={(v) => `${v.word} — ${v.meaning}`}
          onSelect={setLinkedVocabId}
          placeholder="Search vocab…"
        />
        <LinkSelect
          label="Linked grammar point (optional)"
          options={grammarOptions}
          selectedId={linkedGrammarId}
          renderLabel={(g) => `${g.pattern} — ${g.meaning}`}
          onSelect={setLinkedGrammarId}
          placeholder="Search grammar…"
        />
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90 disabled:opacity-60"
        >
          {submitting ? 'Saving…' : 'Add mistake'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
