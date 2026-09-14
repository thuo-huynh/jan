create table public.task_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  board_id uuid not null references public.boards(id) on delete cascade,
  column_id uuid not null references public.columns(id) on delete restrict,
  title text not null, description text, tags text[] not null default '{}',
  estimated_minutes smallint check (estimated_minutes between 5 and 720),
  checklist jsonb not null default '[]'::jsonb,
  archived_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.task_templates enable row level security;
create policy "task_templates_own" on public.task_templates for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
