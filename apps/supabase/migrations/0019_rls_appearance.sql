-- 0019_rls_appearance.sql
-- RLS for themes (global, read-only to regular users) and
-- user_appearance_preferences (owner-scoped). See
-- specs/002-habit-tracker-theme/data-model.md "RLS Summary (additions)".

-- ---------------------------------------------------------------------------
-- themes: no user_id column at all — every authenticated user may SELECT;
-- no insert/update/delete policy is defined for the authenticated role, so
-- those operations are only reachable via the service-role client (admin
-- routes), same reasoning as vocab_entries'/grammar_points' global rows.
-- ---------------------------------------------------------------------------
alter table public.themes enable row level security;

create policy "themes_select_all" on public.themes
  for select using (true);

-- ---------------------------------------------------------------------------
-- user_appearance_preferences: owner-only via user_id.
-- ---------------------------------------------------------------------------
alter table public.user_appearance_preferences enable row level security;

create policy "user_appearance_preferences_select_own" on public.user_appearance_preferences
  for select using (auth.uid() = user_id);
create policy "user_appearance_preferences_insert_own" on public.user_appearance_preferences
  for insert with check (auth.uid() = user_id);
create policy "user_appearance_preferences_update_own" on public.user_appearance_preferences
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
