'use client';

import { useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import { createClient } from '@/shared/supabase/client';
import type { ChecklistItem } from '../types';

interface ChecklistEditorProps {
  taskId: string;
  items: ChecklistItem[];
  /** Called after any successful CRUD op with the new items + derived progress_pct. */
  onChange: (items: ChecklistItem[], progressPct: number) => void;
}

function derivedProgress(items: ChecklistItem[]): number {
  if (items.length === 0) return 0;
  const done = items.filter((i) => i.completed).length;
  return Math.round((done / items.length) * 100);
}

/**
 * Checklist item CRUD + progress % derivation (T038). Each mutation persists
 * to `task_checklist_items` and then writes the recomputed `progress_pct`
 * onto the parent `tasks` row so FR-009 ("progress derivable from checklist
 * completion when a checklist exists") holds without a separate save step.
 */
export function ChecklistEditor({ taskId, items, onChange }: ChecklistEditorProps) {
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function persistProgress(nextItems: ChecklistItem[]) {
    const pct = derivedProgress(nextItems);
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from('tasks')
      .update({ progress_pct: pct, updated_at: new Date().toISOString() })
      .eq('id', taskId);
    if (updateError) {
      setError(updateError.message);
    }
    onChange(nextItems, pct);
  }

  async function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setBusy(true);
    setError(null);

    const supabase = createClient();
    const { data, error: insertError } = await supabase
      .from('task_checklist_items')
      .insert({ task_id: taskId, text, completed: false, position: items.length })
      .select('id, task_id, text, completed, position')
      .single();

    setBusy(false);
    if (insertError || !data) {
      setError(insertError?.message ?? 'Could not add checklist item.');
      return;
    }
    setDraft('');
    await persistProgress([...items, data]);
  }

  async function handleToggle(item: ChecklistItem) {
    setError(null);
    const nextCompleted = !item.completed;
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from('task_checklist_items')
      .update({ completed: nextCompleted })
      .eq('id', item.id);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    const nextItems = items.map((i) => (i.id === item.id ? { ...i, completed: nextCompleted } : i));
    await persistProgress(nextItems);
  }

  async function handleTextChange(item: ChecklistItem, text: string) {
    const nextItems = items.map((i) => (i.id === item.id ? { ...i, text } : i));
    onChange(nextItems, derivedProgress(nextItems));
  }

  async function handleTextCommit(item: ChecklistItem, text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from('task_checklist_items')
      .update({ text: trimmed })
      .eq('id', item.id);
    if (updateError) setError(updateError.message);
  }

  async function handleDelete(item: ChecklistItem) {
    setError(null);
    const supabase = createClient();
    const { error: deleteError } = await supabase.from('task_checklist_items').delete().eq('id', item.id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    const nextItems = items.filter((i) => i.id !== item.id);
    await persistProgress(nextItems);
  }

  const total = items.length;
  const done = items.filter((i) => i.completed).length;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Checklist</h3>
        {total > 0 && (
          <span className="text-xs text-muted-foreground">
            {done}/{total} ({derivedProgress(items)}%)
          </span>
        )}
      </div>

      {total > 0 && (
        <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${derivedProgress(items)}%` }}
          />
        </div>
      )}

      <ul className="space-y-1.5">
        {items
          .slice()
          .sort((a, b) => a.position - b.position)
          .map((item) => (
            <li key={item.id} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={item.completed}
                onChange={() => handleToggle(item)}
                className="h-4 w-4 shrink-0 rounded border-border text-primary focus:ring-primary"
              />
              <input
                value={item.text}
                onChange={(e) => handleTextChange(item, e.target.value)}
                onBlur={(e) => handleTextCommit(item, e.target.value)}
                className={`flex-1 rounded border border-transparent bg-transparent px-1 py-0.5 text-sm outline-none transition-colors hover:border-border focus:border-primary ${
                  item.completed ? 'text-muted-foreground line-through' : 'text-foreground'
                }`}
              />
              <button
                type="button"
                onClick={() => handleDelete(item)}
                aria-label="Delete checklist item"
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-danger/10 hover:text-danger"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </li>
          ))}
      </ul>

      <form onSubmit={handleAdd} className="mt-2 flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add checklist item"
          className="input-field h-9 flex-1"
        />
        <button type="submit" disabled={busy} className="btn-outline h-9 px-3 text-sm">
          Add
        </button>
      </form>

      {error && <p className="error-text">{error}</p>}
    </div>
  );
}
