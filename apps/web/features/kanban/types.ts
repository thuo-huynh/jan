/**
 * Shared Kanban types mirroring data-model.md's `boards` / `columns` /
 * `tasks` / `task_checklist_items` tables. Kept close to the DB row shape
 * (snake_case) since these objects are passed directly between Supabase
 * query results and the client components without a mapping layer.
 */

export interface BoardSummary {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
}

export interface ChecklistItem {
  id: string;
  task_id: string;
  text: string;
  completed: boolean;
  position: number;
}

export interface BoardTask {
  id: string;
  column_id: string;
  board_id: string;
  title: string;
  description: string | null;
  tags: string[];
  due_date: string | null;
  progress_pct: number;
  attachment_count: number;
  assignee_id: string | null;
  position: number;
  created_at: string;
  updated_at: string;
  task_checklist_items: ChecklistItem[];
}

export interface BoardColumn {
  id: string;
  board_id: string;
  name: string;
  position: number;
  created_at: string;
  tasks: BoardTask[];
}

export const DEFAULT_COLUMN_NAMES = ['Cần làm', 'Đang làm', 'Đang review', 'Hoàn thành'] as const;
