-- Daily task priority drives the next-action suggestions on the home workspace.

alter table public.tasks
  add column if not exists priority text not null default 'normal'
  check (priority in ('low', 'normal', 'high'));

create index if not exists idx_tasks_board_priority_due_date
  on public.tasks (board_id, priority, due_date);
