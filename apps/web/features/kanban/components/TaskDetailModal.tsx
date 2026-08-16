'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/shared/supabase/client';
import { taskSchema } from '@/shared/validation/schemas';
import { ChecklistEditor } from './ChecklistEditor';
import type { BoardTask, ChecklistItem } from '../types';

interface TaskDetailModalProps {
  task: BoardTask;
  onClose: () => void;
  onUpdated: (task: BoardTask) => void;
  onDeleted: (taskId: string) => void;
}

/** Task detail/edit modal (T035): description + metadata editing + checklist editor. */
export function TaskDetailModal({ task, onClose, onUpdated, onDeleted }: TaskDetailModalProps) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? '');
  const [tagsInput, setTagsInput] = useState(task.tags.join(', '));
  const [dueDate, setDueDate] = useState(task.due_date ?? '');
  const [progressPct, setProgressPct] = useState(task.progress_pct);
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>(task.task_checklist_items);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const hasChecklist = checklistItems.length > 0;

  function handleChecklistChange(items: ChecklistItem[], pct: number) {
    setChecklistItems(items);
    setProgressPct(pct);
    onUpdated({ ...task, task_checklist_items: items, progress_pct: pct });
  }

  async function handleSave() {
    setError(null);
    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const parsed = taskSchema.pick({ title: true, description: true, tags: true, dueDate: true }).safeParse({
      title,
      description: description || null,
      tags,
      dueDate: dueDate || null,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Invalid task fields.');
      return;
    }

    setSaving(true);
    const supabase = createClient();
    const payload: Record<string, unknown> = {
      title: parsed.data.title,
      description: parsed.data.description,
      tags: parsed.data.tags,
      due_date: parsed.data.dueDate,
      updated_at: new Date().toISOString(),
    };
    if (!hasChecklist) {
      payload.progress_pct = Math.max(0, Math.min(100, progressPct));
    }

    const { data, error: updateError } = await supabase
      .from('tasks')
      .update(payload)
      .eq('id', task.id)
      .select(
        'id, column_id, board_id, title, description, tags, due_date, progress_pct, attachment_count, assignee_id, position, created_at, updated_at',
      )
      .single();

    setSaving(false);
    if (updateError || !data) {
      setError(updateError?.message ?? 'Could not save task.');
      return;
    }

    onUpdated({ ...data, task_checklist_items: checklistItems });
    onClose();
  }

  async function handleDelete() {
    if (!window.confirm('Delete this task? This cannot be undone.')) return;
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const { error: deleteError } = await supabase.from('tasks').delete().eq('id', task.id);
    setSaving(false);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    onDeleted(task.id);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border border-border bg-card p-5 shadow-lg"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Task details"
      >
        <div className="flex items-start justify-between gap-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-md border border-transparent bg-transparent px-1 text-lg font-semibold text-foreground outline-none transition-colors hover:border-border focus:border-primary"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Due date</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Tags (comma-separated)</label>
            <input
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="n2, urgent"
              className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground outline-none focus:border-primary"
            />
          </div>
        </div>

        {!hasChecklist && (
          <div className="mt-4">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Progress % (no checklist yet — set manually)
            </label>
            <input
              type="number"
              min={0}
              max={100}
              value={progressPct}
              onChange={(e) => setProgressPct(Number(e.target.value))}
              className="w-24 rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground outline-none focus:border-primary"
            />
          </div>
        )}

        <div className="mt-4">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="w-full resize-none rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground outline-none focus:border-primary"
          />
        </div>

        <div className="mt-5 border-t border-border pt-4">
          <ChecklistEditor taskId={task.id} items={checklistItems} onChange={handleChecklistChange} />
        </div>

        {error && <p className="mt-3 text-sm text-danger">{error}</p>}

        <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
          <button
            type="button"
            onClick={handleDelete}
            disabled={saving}
            className="text-sm font-medium text-danger transition-colors hover:opacity-80 disabled:opacity-60"
          >
            Delete task
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90 disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
