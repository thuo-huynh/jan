-- JanGo Daily Planning: one-time SQL Editor script
-- Includes migrations 0037 through 0045.
-- Safe to re-run: existing tables, indexes, columns, and policies are retained/replaced.

-- 0037: one internal Daily Tasks board per user
alter table public.boards
  add column if not exists is_daily boolean not null default false;

create unique index if not exists boards_one_daily_per_user
  on public.boards (user_id)
  where is_daily;

-- 0038: optional task duration estimate
alter table public.tasks
  add column if not exists estimated_minutes smallint
  check (estimated_minutes between 5 and 720);

create index if not exists idx_tasks_board_id_due_date
  on public.tasks (board_id, due_date);

-- 0039: reusable task templates
create table if not exists public.task_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  board_id uuid not null references public.boards(id) on delete cascade,
  column_id uuid not null references public.columns(id) on delete restrict,
  title text not null,
  description text,
  tags text[] not null default '{}',
  estimated_minutes smallint check (estimated_minutes between 5 and 720),
  checklist jsonb not null default '[]'::jsonb,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.task_templates enable row level security;
drop policy if exists "task_templates_own" on public.task_templates;
create policy "task_templates_own" on public.task_templates
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 0040: repeat schedules for templates
create table if not exists public.task_recurrence_schedules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  template_id uuid not null references public.task_templates(id) on delete cascade,
  cadence text not null check (cadence in ('daily', 'weekdays', 'weekly', 'monthly')),
  weekdays smallint[] not null default '{}',
  anchor_date date not null default current_date,
  next_occurrence_date date not null default current_date,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.task_recurrence_schedules enable row level security;
drop policy if exists "task_recurrence_schedules_own" on public.task_recurrence_schedules;
create policy "task_recurrence_schedules_own" on public.task_recurrence_schedules
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 0041: time blocks used by Planner
create table if not exists public.focus_blocks (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create index if not exists idx_focus_blocks_task_id on public.focus_blocks(task_id);
create index if not exists idx_focus_blocks_starts_at on public.focus_blocks(starts_at);

alter table public.focus_blocks enable row level security;
drop policy if exists "focus_blocks_own" on public.focus_blocks;
create policy "focus_blocks_own" on public.focus_blocks
  for all
  using (
    exists (
      select 1 from public.tasks t
      join public.boards b on b.id = t.board_id
      where t.id = focus_blocks.task_id and b.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.tasks t
      join public.boards b on b.id = t.board_id
      where t.id = focus_blocks.task_id and b.user_id = auth.uid()
    )
  );

-- 0042: fixed automation preset preferences
create table if not exists public.daily_task_automation_presets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  board_id uuid not null references public.boards(id) on delete cascade,
  preset_type text not null check (
    preset_type in ('recurring-routine', 'complete-to-column', 'overdue-review')
  ),
  enabled boolean not null default false,
  config jsonb not null default '{}'::jsonb,
  unique(user_id, board_id, preset_type)
);

alter table public.daily_task_automation_presets enable row level security;
drop policy if exists "daily_task_automation_presets_own" on public.daily_task_automation_presets;
create policy "daily_task_automation_presets_own" on public.daily_task_automation_presets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 0043: priority used by the Today recommendation
alter table public.tasks
  add column if not exists priority text not null default 'normal'
  check (priority in ('low', 'normal', 'high'));

create index if not exists idx_tasks_board_priority_due_date
  on public.tasks (board_id, priority, due_date);

-- 0044: persisted session state for the focus timer
alter table public.focus_blocks
  add column if not exists status text not null default 'scheduled'
  check (status in ('scheduled', 'active', 'paused', 'completed')),
  add column if not exists paused_at timestamptz,
  add column if not exists remaining_seconds integer
  check (remaining_seconds is null or remaining_seconds > 0),
  add column if not exists completed_at timestamptz;

create index if not exists idx_focus_blocks_status_starts_at
  on public.focus_blocks (status, starts_at);

-- 0045: brief daily reflection and tomorrow's chosen task
create table if not exists public.daily_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  review_date date not null,
  note text not null default '',
  tomorrow_task_id uuid references public.tasks(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, review_date)
);

alter table public.daily_reviews enable row level security;
drop policy if exists "daily_reviews_own" on public.daily_reviews;
create policy "daily_reviews_own" on public.daily_reviews
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
