import { redirect } from 'next/navigation';
import { createClient, getAuthedUser } from '@/shared/supabase/server';
import { BoardView } from '@/features/kanban/components/Board';
import {
  DEFAULT_COLUMN_NAMES,
  type BoardColumn,
  type BoardTask,
  type ChecklistItem,
} from '@/features/kanban/types';

async function ensureDailyBoard(supabase: ReturnType<typeof createClient>, userId: string) {
  const existing = await supabase
    .from('boards')
    .select('id, user_id, name, is_daily, created_at')
    .eq('user_id', userId)
    .eq('is_daily', true)
    .maybeSingle();
  if (existing.data) return existing.data;

  const inserted = await supabase
    .from('boards')
    .insert({ user_id: userId, name: 'Daily Tasks', is_daily: true })
    .select('id, user_id, name, is_daily, created_at')
    .single();
  if (inserted.data) {
    await supabase
      .from('columns')
      .insert(
        DEFAULT_COLUMN_NAMES.map((name, position) => ({
          board_id: inserted.data.id,
          name,
          position,
        }))
      );
    return inserted.data;
  }

  // A second tab may have created it first; the partial unique index makes this safe.
  const concurrent = await supabase
    .from('boards')
    .select('id, user_id, name, is_daily, created_at')
    .eq('user_id', userId)
    .eq('is_daily', true)
    .maybeSingle();
  if (concurrent.data) return concurrent.data;
  throw new Error(
    inserted.error?.message ?? existing.error?.message ?? 'Không thể chuẩn bị Daily Tasks.'
  );
}

/**
 * Daily planning page. A single internal board retains the existing Kanban
 * storage and drag interactions while the calendar is the user-facing way to
 * organise work; users never create or choose a board here.
 */
export default async function BoardsPage() {
  const supabase = createClient();
  const user = await getAuthedUser();

  if (!user) {
    redirect('/login');
  }

  const board = await ensureDailyBoard(supabase, user.id);
  const { data: columnRows } = await supabase
    .from('columns')
    .select('id, board_id, name, position, created_at')
    .eq('board_id', board.id)
    .order('position', { ascending: true });
  const { data: taskRows } = await supabase
    .from('tasks')
    .select(
      'id, column_id, board_id, title, description, tags, due_date, progress_pct, attachment_count, assignee_id, position, created_at, updated_at'
    )
    .eq('board_id', board.id)
    .order('position', { ascending: true });
  const taskIds = (taskRows ?? []).map((task) => task.id);
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
    checklistByTask.set(item.task_id, [...(checklistByTask.get(item.task_id) ?? []), item]);
  }
  const tasksByColumn = new Map<string, BoardTask[]>();
  for (const task of taskRows ?? []) {
    tasksByColumn.set(task.column_id, [
      ...(tasksByColumn.get(task.column_id) ?? []),
      { ...task, task_checklist_items: checklistByTask.get(task.id) ?? [] },
    ]);
  }
  const columns: BoardColumn[] = (columnRows ?? []).map((column) => ({
    ...column,
    tasks: tasksByColumn.get(column.id) ?? [],
  }));

  return (
    <div>
      <div className="mb-8">
        <h1 className="page-heading">Daily Tasks</h1>
        <p className="page-intro">
          Chọn một ngày để lên kế hoạch, theo dõi và hoàn thành việc học của bạn.
        </p>
      </div>
      <BoardView boardId={board.id} initialColumns={columns} dailyMode />
    </div>
  );
}
