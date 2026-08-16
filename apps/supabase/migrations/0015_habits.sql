-- 0015_habits.sql
-- habits / habit_completions
-- See specs/002-habit-tracker-theme/data-model.md "habits" / "habit_completions".
-- Row existence in habit_completions IS completion (no boolean column) —
-- ticking a day inserts a row, un-ticking deletes it (research.md §4).

create table if not exists public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_habits_user_id on public.habits (user_id);

create table if not exists public.habit_completions (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null references public.habits (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  completion_date date not null,
  created_at timestamptz not null default now(),
  unique (habit_id, completion_date)
);

create index if not exists idx_habit_completions_habit_id on public.habit_completions (habit_id);
create index if not exists idx_habit_completions_user_id_date on public.habit_completions (user_id, completion_date);
