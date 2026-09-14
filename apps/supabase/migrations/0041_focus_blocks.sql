create table public.focus_blocks (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  starts_at timestamptz not null, ends_at timestamptz not null,
  created_at timestamptz not null default now(), check (ends_at > starts_at)
);
create index idx_focus_blocks_task_id on public.focus_blocks(task_id);
create index idx_focus_blocks_starts_at on public.focus_blocks(starts_at);
alter table public.focus_blocks enable row level security;
create policy "focus_blocks_own" on public.focus_blocks for all using (exists (select 1 from public.tasks t join public.boards b on b.id=t.board_id where t.id=focus_blocks.task_id and b.user_id=auth.uid())) with check (exists (select 1 from public.tasks t join public.boards b on b.id=t.board_id where t.id=focus_blocks.task_id and b.user_id=auth.uid()));
