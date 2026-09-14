create table public.daily_task_automation_presets (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  board_id uuid not null references public.boards(id) on delete cascade,
  preset_type text not null check (preset_type in ('recurring-routine','complete-to-column','overdue-review')),
  enabled boolean not null default false, config jsonb not null default '{}'::jsonb,
  unique(user_id, board_id, preset_type)
);
alter table public.daily_task_automation_presets enable row level security;
create policy "daily_task_automation_presets_own" on public.daily_task_automation_presets for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
