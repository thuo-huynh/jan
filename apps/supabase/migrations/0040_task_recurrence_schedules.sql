create table public.task_recurrence_schedules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  template_id uuid not null references public.task_templates(id) on delete cascade,
  cadence text not null check (cadence in ('daily','weekdays','weekly','monthly')),
  weekdays smallint[] not null default '{}', anchor_date date not null default current_date,
  next_occurrence_date date not null default current_date, enabled boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.task_recurrence_schedules enable row level security;
create policy "task_recurrence_schedules_own" on public.task_recurrence_schedules for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
