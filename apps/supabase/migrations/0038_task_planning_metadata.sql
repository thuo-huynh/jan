-- 0038_task_planning_metadata.sql
-- Optional duration estimate used by Daily Tasks and the focus-time Planner.

alter table public.tasks
  add column if not exists estimated_minutes smallint
  check (estimated_minutes between 5 and 720);

create index if not exists idx_tasks_board_id_due_date
  on public.tasks (board_id, due_date);
