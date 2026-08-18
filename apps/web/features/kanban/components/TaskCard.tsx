'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { AlertTriangle, Clock, Paperclip } from 'lucide-react';
import { getDueUrgency } from '../lib/urgency';
import type { BoardTask } from '../types';

interface TaskCardProps {
  task: BoardTask;
  onClick: (taskId: string) => void;
  /** Rendered inert inside <DragOverlay> — skips sortable wiring. */
  overlay?: boolean;
}

/**
 * Due-date badge styling per urgency (T034 polish): overdue is `danger`
 * (destructive/needs-fixing per DESIGN.md), due-today is `accent`
 * (DESIGN.md explicitly calls out "due/urgent badges" as the sanctioned
 * `accent` use case — this is the one place on the board that color should
 * appear), due-soon (next 2 days) is `warning`, everything else is neutral.
 */
const DUE_BADGE_CLASS: Record<'overdue' | 'today' | 'soon' | 'none', string> = {
  overdue: 'badge-danger',
  today: 'badge-accent',
  soon: 'badge-warning',
  none: 'badge-neutral',
};

function initials(assigneeId: string | null): string {
  if (!assigneeId) return '';
  return assigneeId.slice(0, 2).toUpperCase();
}

/** Task card (T034): title, tags, due date, progress, attachment count, assignee avatar. */
export function TaskCard({ task, onClick, overlay }: TaskCardProps) {
  const sortable = useSortable({
    id: task.id,
    data: { type: 'task', columnId: task.column_id },
    disabled: overlay,
  });
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = sortable;

  const style = overlay
    ? undefined
    : {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
      };

  const checklist = task.task_checklist_items;
  const checklistTotal = checklist.length;
  const checklistDone = checklist.filter((item) => item.completed).length;
  const urgency = getDueUrgency(task.due_date);

  return (
    <div
      ref={overlay ? undefined : setNodeRef}
      style={style}
      {...(overlay ? {} : attributes)}
      {...(overlay ? {} : listeners)}
      onClick={() => !overlay && onClick(task.id)}
      role="button"
      tabIndex={overlay ? -1 : 0}
      onKeyDown={(e) => {
        if (!overlay && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick(task.id);
        }
      }}
      className={`cursor-pointer rounded-lg border border-border bg-card p-3 text-left shadow-sm transition-colors hover:border-primary/40 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary ${
        overlay ? 'shadow-lg' : ''
      }`}
    >
      <p className="text-sm font-medium text-foreground">{task.title}</p>

      {task.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {task.tags.map((tag) => (
            <span
              key={tag}
              className="rounded bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {checklistTotal > 0 && (
        <div className="mt-2">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${task.progress_pct}%` }}
            />
          </div>
        </div>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
        {task.due_date && (
          <span className={DUE_BADGE_CLASS[urgency ?? 'none']}>
            {urgency === 'overdue' ? (
              <AlertTriangle className="h-3 w-3" aria-hidden="true" />
            ) : urgency === 'today' ? (
              <Clock className="h-3 w-3" aria-hidden="true" />
            ) : null}
            {urgency === 'today'
              ? 'Due today'
              : new Date(`${task.due_date}T00:00:00`).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                })}
          </span>
        )}
        {checklistTotal > 0 && (
          <span className="badge-neutral">
            {checklistDone}/{checklistTotal}
          </span>
        )}
        {task.attachment_count > 0 && (
          <span className="badge-neutral">
            <Paperclip className="h-3 w-3" aria-hidden="true" />
            {task.attachment_count}
          </span>
        )}
        {task.assignee_id && (
          <span
            title="Assignee"
            className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground"
          >
            {initials(task.assignee_id)}
          </span>
        )}
      </div>
    </div>
  );
}
