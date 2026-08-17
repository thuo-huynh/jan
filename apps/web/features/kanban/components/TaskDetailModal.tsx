'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
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
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border border-border bg-card p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Task details"
      >
        <div className="flex items-start justify-between gap-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded border border-transparent bg-transparent px-1 text-lg font-semibold text-foreground outline-none transition-colors hover:border-border focus:border-primary"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="label-field text-xs">Due date</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="input-field h-9"
            />
          </div>
          <div>
            <label className="label-field text-xs">Tags (comma-separated)</label>
            <input
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="n2, urgent"
              className="input-field h-9"
            />
          </div>
        </div>

        {!hasChecklist && (
          <div className="mt-4">
            <label className="label-field text-xs">Progress % (no checklist yet — set manually)</label>
            <input
              type="number"
              min={0}
              max={100}
              value={progressPct}
              onChange={(e) => setProgressPct(Number(e.target.value))}
              className="input-field h-9 w-24"
            />
          </div>
        )}

        <div className="mt-4">
          <label className="label-field text-xs">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="textarea-field resize-none"
          />
        </div>

        <div className="mt-5 border-t border-border pt-4">
          <ChecklistEditor taskId={task.id} items={checklistItems} onChange={handleChecklistChange} />
        </div>

        {error && <p className="error-text mt-3">{error}</p>}

        <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
          <button type="button" onClick={handleDelete} disabled={saving} className="btn-ghost h-9 px-2.5 text-danger hover:bg-danger/10">
            Delete task
          </button>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="btn-outline h-9 px-3 text-sm">
              Cancel
            </button>
            <button type="button" onClick={handleSave} disabled={saving} className="btn-primary h-9 px-4 text-sm">
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
