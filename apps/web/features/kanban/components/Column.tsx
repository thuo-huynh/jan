'use client';

import { useSortable } from '@dnd-kit/sortable';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { useState, type FormEvent, type KeyboardEvent } from 'react';
import { X } from 'lucide-react';
import { TaskCard } from './TaskCard';
import type { BoardColumn } from '../types';

interface ColumnProps {
  column: BoardColumn;
  onRename: (columnId: string, name: string) => void;
  onDelete: (columnId: string) => void;
  onAddTask: (columnId: string, title: string) => void;
  onTaskClick: (taskId: string) => void;
}

/** Column component (T033): rename/add task/remove; reorder is wired by Board (T036) via dnd-kit. */
export function Column({ column, onRename, onDelete, onAddTask, onTaskClick }: ColumnProps) {
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(column.name);
  const [addingTask, setAddingTask] = useState(false);
  const [taskTitleDraft, setTaskTitleDraft] = useState('');

  const sortable = useSortable({ id: column.id, data: { type: 'column' } });
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = sortable;
  const { setNodeRef: setDroppableRef } = useDroppable({
    id: column.id,
    data: { type: 'column', columnId: column.id },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  function commitRename() {
    setEditingName(false);
    const trimmed = nameDraft.trim();
    if (trimmed && trimmed !== column.name) {
      onRename(column.id, trimmed);
    } else {
      setNameDraft(column.name);
    }
  }

  function handleNameKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') commitRename();
    if (e.key === 'Escape') {
      setNameDraft(column.name);
      setEditingName(false);
    }
  }

  function handleAddTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = taskTitleDraft.trim();
    if (!trimmed) return;
    onAddTask(column.id, trimmed);
    setTaskTitleDraft('');
    setAddingTask(false);
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex w-72 shrink-0 flex-col rounded-lg border border-border bg-background"
    >
      <div
        className="flex items-center gap-2 border-b border-border px-3 py-2"
        {...attributes}
        {...listeners}
      >
        {editingName ? (
          <input
            autoFocus
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            onBlur={commitRename}
            onKeyDown={handleNameKeyDown}
            className="w-full rounded border border-primary bg-card px-1.5 py-0.5 text-sm font-semibold text-foreground outline-none"
          />
        ) : (
          <h3
            onClick={() => setEditingName(true)}
            className="flex-1 cursor-text truncate text-sm font-semibold text-foreground"
            title="Nhấn để đổi tên"
          >
            {column.name}
          </h3>
        )}
        <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
          {column.tasks.length}
        </span>
        <button
          type="button"
          onClick={() => onDelete(column.id)}
          aria-label={`Xóa cột ${column.name}`}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-danger/10 hover:text-danger"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <div ref={setDroppableRef} className="flex-1 space-y-2 overflow-y-auto p-2" style={{ minHeight: 40 }}>
        <SortableContext items={column.tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {column.tasks.map((task) => (
            <TaskCard key={task.id} task={task} onClick={onTaskClick} />
          ))}
        </SortableContext>
        {column.tasks.length === 0 && (
          <p className="rounded border border-dashed border-border px-2 py-3 text-center text-xs text-muted-foreground">
            Chưa có công việc nào
          </p>
        )}
      </div>

      <div className="border-t border-border p-2">
        {addingTask ? (
          <form onSubmit={handleAddTask} className="space-y-2">
            <input
              autoFocus
              value={taskTitleDraft}
              onChange={(e) => setTaskTitleDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setAddingTask(false);
                  setTaskTitleDraft('');
                }
              }}
              placeholder="Tên công việc"
              className="input-field h-9"
            />
            <div className="flex gap-2">
              <button type="submit" className="btn-primary h-8 px-3 text-xs">
                Thêm
              </button>
              <button
                type="button"
                onClick={() => {
                  setAddingTask(false);
                  setTaskTitleDraft('');
                }}
                className="btn-ghost h-8 px-3 text-xs"
              >
                Hủy
              </button>
            </div>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setAddingTask(true)}
            className="w-full rounded px-2 py-1.5 text-left text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            + Thêm công việc
          </button>
        )}
      </div>
    </div>
  );
}
