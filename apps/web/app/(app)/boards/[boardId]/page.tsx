import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient, getAuthedUser } from '@/shared/supabase/server';
import { BoardView } from '@/features/kanban/components/Board';
import type { BoardColumn, BoardTask, ChecklistItem } from '@/features/kanban/types';

interface BoardDetailPageProps {
  params: { boardId: string };
}

/**
 * Board detail page shell (T032). Server Component loads the board's
 * columns/tasks/checklist items in three flat queries (rather than a nested
 * PostgREST embed) so ordering by `position` at every level is explicit and
 * predictable, then hands the assembled tree to the client `BoardView` for
 * drag-and-drop (T036) and mutation (T037/T038).
 */
export default async function BoardDetailPage({ params }: BoardDetailPageProps) {
  const supabase = createClient();
  const user = await getAuthedUser();

  if (!user) {
    redirect('/login');
  }

  const { data: board } = await supabase
    .from('boards')
    .select('id, user_id, name, created_at')
    .eq('id', params.boardId)
    .maybeSingle();

  if (!board) {
    notFound();
  }

  const { data: columnRows } = await supabase
    .from('columns')
    .select('id, board_id, name, position, created_at')
    .eq('board_id', board.id)
    .order('position', { ascending: true });

  const { data: taskRows } = await supabase
    .from('tasks')
    .select(
      'id, column_id, board_id, title, description, tags, due_date, progress_pct, attachment_count, assignee_id, position, created_at, updated_at',
    )
    .eq('board_id', board.id)
    .order('position', { ascending: true });

  const taskIds = (taskRows ?? []).map((t) => t.id);
  const { data: checklistRows } =
    taskIds.length > 0
      ? await supabase
          .from('task_checklist_items')
          .select('id, task_id, text, completed, position')
          .in('task_id', taskIds)
          .order('position', { ascending: true })
      : { data: [] as ChecklistItem[] };

  const checklistByTask = new Map<string, ChecklistItem[]>();
  for (const item of checklistRows ?? []) {
    const list = checklistByTask.get(item.task_id) ?? [];
    list.push(item);
    checklistByTask.set(item.task_id, list);
  }

  const tasksByColumn = new Map<string, BoardTask[]>();
  for (const task of taskRows ?? []) {
    const list = tasksByColumn.get(task.column_id) ?? [];
    list.push({ ...task, task_checklist_items: checklistByTask.get(task.id) ?? [] });
    tasksByColumn.set(task.column_id, list);
  }

  const columns: BoardColumn[] = (columnRows ?? []).map((column) => ({
    ...column,
    tasks: tasksByColumn.get(column.id) ?? [],
  }));

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/boards"
          className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Back to boards"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
            <path
              fillRule="evenodd"
              d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z"
              clipRule="evenodd"
            />
          </svg>
        </Link>
        <h1 className="text-xl font-semibold text-foreground">{board.name}</h1>
      </div>

      <BoardView boardId={board.id} initialColumns={columns} />
    </div>
  );
}
