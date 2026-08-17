'use client';

import { useMemo, useState } from 'react';
import type { TaskOption, VocabOption } from '../lib/types';

/**
 * Searchable single-select combobox used for both halves of NoteLinkPicker.
 * Local-filters the option list already fetched server-side (T079's page
 * passes down the caller's own tasks + readable vocab entries) — no extra
 * client-side Supabase round trip needed for typeahead at this project's
 * expected scale.
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
      <label className="label-field">{label}</label>
      {selected ? (
        <div className="flex h-10 items-center justify-between gap-2 rounded border border-border bg-background px-3 text-sm">
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
            className="input-field"
          />
          {open && (
            <ul className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-border bg-card py-1 text-sm shadow-lg">
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

/**
 * Task/vocab link picker for a note (T083), writing `linked_task_id` /
 * `linked_vocab_id`.
 *
 * Deviation from tasks.md ("task/vocab/grammar link picker"): data-model.md's
 * `notes` table only defines `linked_task_id` and `linked_vocab_id` columns
 * (no `linked_grammar_id`) — see report. Only task + vocab linking is wired
 * up here, per data-model.md as the authoritative schema.
 */
export function NoteLinkPicker({
  taskOptions,
  vocabOptions,
  linkedTaskId,
  linkedVocabId,
  onLinkedTaskChange,
  onLinkedVocabChange,
}: {
  taskOptions: TaskOption[];
  vocabOptions: VocabOption[];
  linkedTaskId: string | null;
  linkedVocabId: string | null;
  onLinkedTaskChange: (id: string | null) => void;
  onLinkedVocabChange: (id: string | null) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <LinkSelect
        label="Linked task"
        options={taskOptions}
        selectedId={linkedTaskId}
        renderLabel={(t) => t.title || 'Untitled task'}
        onSelect={onLinkedTaskChange}
        placeholder="Search tasks…"
      />
      <LinkSelect
        label="Linked vocab / kanji"
        options={vocabOptions}
        selectedId={linkedVocabId}
        renderLabel={(v) => `${v.word} — ${v.meaning}`}
        onSelect={onLinkedVocabChange}
        placeholder="Search vocab…"
      />
    </div>
  );
}
