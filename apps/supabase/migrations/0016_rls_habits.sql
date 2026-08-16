-- 0016_rls_habits.sql
-- RLS policies for habits / habit_completions (data-model.md "RLS Summary (additions)").
-- Owner-scoped via user_id, same pattern as 0011_rls_owner_scoped.sql. Admin
-- access goes through the service-role client only (no role-based bypass
-- policy — see 0011's header note).

alter table public.habits enable row level security;

create policy "habits_select_own" on public.habits
  for select using (auth.uid() = user_id);
create policy "habits_insert_own" on public.habits
  for insert with check (auth.uid() = user_id);
create policy "habits_update_own" on public.habits
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "habits_delete_own" on public.habits
  for delete using (auth.uid() = user_id);

alter table public.habit_completions enable row level security;

create policy "habit_completions_select_own" on public.habit_completions
  for select using (auth.uid() = user_id);
create policy "habit_completions_insert_own" on public.habit_completions
  for insert with check (auth.uid() = user_id);
create policy "habit_completions_delete_own" on public.habit_completions
  for delete using (auth.uid() = user_id);
