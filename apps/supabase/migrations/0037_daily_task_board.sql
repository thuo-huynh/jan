-- 0037_daily_task_board.sql
-- Daily Tasks uses one internal Kanban board per user. The UI never exposes
-- board creation: dates on the planner are the organising surface instead.

alter table public.boards
  add column if not exists is_daily boolean not null default false;

create unique index if not exists boards_one_daily_per_user
  on public.boards (user_id)
  where is_daily;
