-- 0002_kanban.sql
-- boards / columns / tasks / task_checklist_items
-- See specs/001-tasknihongo/data-model.md "boards / columns / tasks / task_checklist_items".
-- Ownership is via boards.user_id; columns/tasks/checklist items derive ownership
-- via join (enforced later in 0011_rls_owner_scoped.sql).

create table if not exists public.boards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_boards_user_id on public.boards (user_id);

create table if not exists public.columns (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards (id) on delete cascade,
  name text not null,
  position int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_columns_board_id on public.columns (board_id);
create index if not exists idx_columns_board_id_position on public.columns (board_id, position);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  column_id uuid not null references public.columns (id) on delete cascade,
  -- Denormalized for RLS/filtering (avoids a columns->boards double-join on every task policy check).
  board_id uuid not null references public.boards (id) on delete cascade,
  title text not null,
  description text,
  tags text[] not null default '{}',
  due_date date,
  progress_pct int not null default 0 check (progress_pct between 0 and 100),
  attachment_count int not null default 0 check (attachment_count >= 0),
  assignee_id uuid references public.profiles (id) on delete set null,
  position int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_tasks_column_id on public.tasks (column_id);
create index if not exists idx_tasks_column_id_position on public.tasks (column_id, position);
create index if not exists idx_tasks_board_id on public.tasks (board_id);
create index if not exists idx_tasks_assignee_id on public.tasks (assignee_id);
create index if not exists idx_tasks_due_date on public.tasks (due_date);
create index if not exists idx_tasks_tags on public.tasks using gin (tags);

create table if not exists public.task_checklist_items (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  text text not null,
  completed boolean not null default false,
  position int not null default 0
);

create index if not exists idx_task_checklist_items_task_id on public.task_checklist_items (task_id);
