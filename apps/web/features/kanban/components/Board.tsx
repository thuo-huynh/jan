'use client';

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { useCallback, useMemo, useRef, useState, type FormEvent } from 'react';
import { Plus, X } from 'lucide-react';
import { createClient } from '@/shared/supabase/client';
import { Column } from './Column';
import { TaskCard } from './TaskCard';
import { TaskDetailModal } from './TaskDetailModal';
import { BoardFilters, EMPTY_FILTERS, type BoardFilterState } from './BoardFilters';
import type { BoardColumn, BoardTask } from '../types';

interface BoardProps {
  boardId: string;
  initialColumns: BoardColumn[];
}

/**
 * Board drag-and-drop wiring (T036) + optimistic task-move mutation with
 * rollback-on-failure (T037). Column reorder and task move/reorder both
 * apply to local state immediately (FR-011 optimistic UI), then persist via
 * the browser Supabase client; on failure the pre-drag snapshot is restored
 * and an inline error banner is shown (no toast system exists yet — that's
 * Polish-phase T098).
 */
export function BoardView({ boardId, initialColumns }: BoardProps) {
  const [columns, setColumns] = useState<BoardColumn[]>(initialColumns);
  const [activeTask, setActiveTask] = useState<BoardTask | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [filters, setFilters] = useState<BoardFilterState>(EMPTY_FILTERS);
  const [newColumnName, setNewColumnName] = useState('');
  const [addingColumn, setAddingColumn] = useState(false);

  const snapshotRef = useRef<BoardColumn[] | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const findColumnByTaskId = useCallback(
    (taskId: string) => columns.find((c) => c.tasks.some((t) => t.id === taskId)),
    [columns],
  );

  const filteredColumns = useMemo(
    () =>
      columns.map((c) => ({
        ...c,
        tasks: c.tasks.filter((t) => {
          if (filters.columnId && filters.columnId !== c.id) return false;
          if (filters.tag && !t.tags.includes(filters.tag)) return false;
          if (filters.dueBefore && (!t.due_date || t.due_date > filters.dueBefore)) return false;
          if (filters.query) {
            const q = filters.query.toLowerCase();
            const haystack = `${t.title} ${t.description ?? ''}`.toLowerCase();
            if (!haystack.includes(q)) return false;
          }
          return true;
        }),
      })),
    [columns, filters],
  );

  const selectedTask = selectedTaskId
    ? columns.flatMap((c) => c.tasks).find((t) => t.id === selectedTaskId) ?? null
    : null;

  // ---------------------------------------------------------------------
  // Drag handlers
  // ---------------------------------------------------------------------

  function handleDragStart(event: DragStartEvent) {
    snapshotRef.current = columns;
    const { active } = event;
    if (active.data.current?.type === 'task') {
      const col = findColumnByTaskId(String(active.id));
      setActiveTask(col?.tasks.find((t) => t.id === active.id) ?? null);
    }
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over || active.data.current?.type !== 'task') return;

    const activeId = String(active.id);
    const overId = String(over.id);
    if (activeId === overId) return;

    const activeColumn = findColumnByTaskId(activeId);
    const overColumn =
      over.data.current?.type === 'task' ? findColumnByTaskId(overId) : columns.find((c) => c.id === overId);

    if (!activeColumn || !overColumn || activeColumn.id === overColumn.id) return;

    setColumns((prev) => {
      const activeItems = prev.find((c) => c.id === activeColumn.id)?.tasks ?? [];
      const overItems = prev.find((c) => c.id === overColumn.id)?.tasks ?? [];
      const activeIndex = activeItems.findIndex((t) => t.id === activeId);
      const movingTask = activeItems[activeIndex];
      if (!movingTask) return prev;

      const overIndex = overItems.findIndex((t) => t.id === overId);
      const insertAt = overIndex >= 0 ? overIndex : overItems.length;

      const newActiveItems = activeItems.filter((t) => t.id !== activeId);
      const newOverItems = [
        ...overItems.slice(0, insertAt),
        { ...movingTask, column_id: overColumn.id },
        ...overItems.slice(insertAt),
      ];

      return prev.map((c) => {
        if (c.id === activeColumn.id) return { ...c, tasks: newActiveItems };
        if (c.id === overColumn.id) return { ...c, tasks: newOverItems };
        return c;
      });
    });
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    const type = active.data.current?.type;
    const previous = snapshotRef.current;
    setActiveTask(null);

    if (!over) {
      snapshotRef.current = null;
      return;
    }

    if (type === 'column') {
      const activeId = String(active.id);
      const overId = String(over.id);
      if (activeId === overId) {
        snapshotRef.current = null;
        return;
      }

      const oldIndex = columns.findIndex((c) => c.id === activeId);
      const newIndex = columns.findIndex((c) => c.id === overId);
      if (oldIndex === -1 || newIndex === -1) {
        snapshotRef.current = null;
        return;
      }

      const reordered = arrayMove(columns, oldIndex, newIndex).map((c, i) => ({ ...c, position: i }));
      setColumns(reordered);
      snapshotRef.current = null;

      const supabase = createClient();
      const results = await Promise.all(
        reordered.map((c) => supabase.from('columns').update({ position: c.position }).eq('id', c.id)),
      );
      const failed = results.find((r) => r.error);
      if (failed) {
        setError('Could not save column order — reverted.');
        if (previous) setColumns(previous);
      }
      return;
    }

    if (type === 'task') {
      const activeId = String(active.id);
      const overId = String(over.id);
      const activeColumn = findColumnByTaskId(activeId);
      if (!activeColumn) {
        snapshotRef.current = null;
        return;
      }

      const overColumn =
        over.data.current?.type === 'task' ? findColumnByTaskId(overId) : columns.find((c) => c.id === overId);
      const targetColumn = overColumn ?? activeColumn;

      let workingColumns = columns;
      if (targetColumn.id === activeColumn.id) {
        const oldIndex = activeColumn.tasks.findIndex((t) => t.id === activeId);
        const newIndex = activeColumn.tasks.findIndex((t) => t.id === overId);
        if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
          workingColumns = columns.map((c) =>
            c.id === activeColumn.id ? { ...c, tasks: arrayMove(c.tasks, oldIndex, newIndex) } : c,
          );
        }
      }

      const finalColumns = workingColumns.map((c) => ({
        ...c,
        tasks: c.tasks.map((t, i) => ({ ...t, position: i, column_id: c.id })),
      }));

      setColumns(finalColumns);
      snapshotRef.current = null;

      const touchedColumnIds = new Set([activeColumn.id, targetColumn.id]);
      const supabase = createClient();
      const updates = finalColumns
        .filter((c) => touchedColumnIds.has(c.id))
        .flatMap((c) => c.tasks)
        .map((t) => supabase.from('tasks').update({ column_id: t.column_id, position: t.position }).eq('id', t.id));

      const results = await Promise.all(updates);
      const failed = results.find((r) => r.error);
      if (failed) {
        setError('Could not save task move — reverted.');
        if (previous) setColumns(previous);
      }
    }
  }

  // ---------------------------------------------------------------------
  // Column CRUD
  // ---------------------------------------------------------------------

  async function handleAddColumn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = newColumnName.trim();
    if (!name) return;

    const supabase = createClient();
    const { data, error: insertError } = await supabase
      .from('columns')
      .insert({ board_id: boardId, name, position: columns.length })
      .select('id, board_id, name, position, created_at')
      .single();

    if (insertError || !data) {
      setError(insertError?.message ?? 'Could not add column.');
      return;
    }
    setColumns((prev) => [...prev, { ...data, tasks: [] }]);
    setNewColumnName('');
    setAddingColumn(false);
  }

  async function handleRenameColumn(columnId: string, name: string) {
    const previous = columns;
    setColumns((prev) => prev.map((c) => (c.id === columnId ? { ...c, name } : c)));
    const supabase = createClient();
    const { error: updateError } = await supabase.from('columns').update({ name }).eq('id', columnId);
    if (updateError) {
      setError('Could not rename column — reverted.');
      setColumns(previous);
    }
  }

  async function handleDeleteColumn(columnId: string) {
    const column = columns.find((c) => c.id === columnId);
    if (!column) return;
    const message =
      column.tasks.length > 0
        ? `Delete "${column.name}" and its ${column.tasks.length} task(s)? This cannot be undone.`
        : `Delete "${column.name}"?`;
    if (!window.confirm(message)) return;

    const previous = columns;
    setColumns((prev) => prev.filter((c) => c.id !== columnId));
    const supabase = createClient();
    const { error: deleteError } = await supabase.from('columns').delete().eq('id', columnId);
    if (deleteError) {
      setError('Could not delete column — reverted.');
      setColumns(previous);
    }
  }

  // ---------------------------------------------------------------------
  // Task CRUD
  // ---------------------------------------------------------------------

  async function handleAddTask(columnId: string, title: string) {
    const column = columns.find((c) => c.id === columnId);
    if (!column) return;

    const supabase = createClient();
    const { data, error: insertError } = await supabase
      .from('tasks')
      .insert({
        column_id: columnId,
        board_id: boardId,
        title,
        tags: [],
        progress_pct: 0,
        attachment_count: 0,
        position: column.tasks.length,
      })
      .select(
        'id, column_id, board_id, title, description, tags, due_date, progress_pct, attachment_count, assignee_id, position, created_at, updated_at',
      )
      .single();

    if (insertError || !data) {
      setError(insertError?.message ?? 'Could not add task.');
      return;
    }

    const newTask: BoardTask = { ...data, task_checklist_items: [] };
    setColumns((prev) => prev.map((c) => (c.id === columnId ? { ...c, tasks: [...c.tasks, newTask] } : c)));
  }

  function handleTaskUpdated(task: BoardTask) {
    setColumns((prev) =>
      prev.map((c) => ({
        ...c,
        tasks: c.tasks.map((t) => (t.id === task.id ? task : t)),
      })),
    );
  }

  function handleTaskDeleted(taskId: string) {
    setColumns((prev) => prev.map((c) => ({ ...c, tasks: c.tasks.filter((t) => t.id !== taskId) })));
  }

  return (
    <div>
      {error && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-danger bg-card px-3 py-2 text-sm text-danger">
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} className="font-medium hover:opacity-80">
            Dismiss
          </button>
        </div>
      )}

      <BoardFilters columns={columns} filters={filters} onChange={setFilters} />

      {columns.length === 0 && (
        <div className="mb-4 flex flex-col items-center gap-2 rounded-lg border border-dashed border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">
            This board has no columns yet. Use &quot;+ Add column&quot; below to create one.
          </p>
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex items-start gap-4 overflow-x-auto pb-4">
          <SortableContext items={columns.map((c) => c.id)} strategy={horizontalListSortingStrategy}>
            {filteredColumns.map((column) => (
              <Column
                key={column.id}
                column={column}
                onRename={handleRenameColumn}
                onDelete={handleDeleteColumn}
                onAddTask={handleAddTask}
                onTaskClick={setSelectedTaskId}
              />
            ))}
          </SortableContext>

          <div className="w-72 shrink-0">
            {addingColumn ? (
              <form onSubmit={handleAddColumn} className="rounded-lg border border-border bg-card p-3">
                <input
                  autoFocus
                  value={newColumnName}
                  onChange={(e) => setNewColumnName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setAddingColumn(false);
                      setNewColumnName('');
                    }
                  }}
                  placeholder="Column name"
                  className="input-field h-9"
                />
                <div className="mt-2 flex gap-2">
                  <button type="submit" className="btn-primary h-8 px-3 text-xs">
                    Add column
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAddingColumn(false);
                      setNewColumnName('');
                    }}
                    className="btn-ghost h-8 px-3 text-xs"
                  >
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setAddingColumn(true)}
                className="flex w-full items-center gap-1.5 rounded-lg border border-dashed border-border p-3 text-left text-sm text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                Add column
              </button>
            )}
          </div>
        </div>

        <DragOverlay>{activeTask ? <TaskCard task={activeTask} onClick={() => {}} overlay /> : null}</DragOverlay>
      </DndContext>

      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          onClose={() => setSelectedTaskId(null)}
          onUpdated={handleTaskUpdated}
          onDeleted={handleTaskDeleted}
        />
      )}
    </div>
  );
}
