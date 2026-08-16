-- 0012_rls_reference_data.sql
-- RLS policies for global/reference tables (data-model.md "RLS Summary").
--
-- vocab_entries and grammar_points are dual-purpose: user_id IS NULL rows are
-- the shared/global N2 reference catalog (readable by any authenticated user,
-- writable only by the service-role client per FR-048); user_id IS NOT NULL
-- rows are a user's own custom entries (owner-scoped like any other
-- user-owned table). grammar_confusable_pairs is pure reference data with no
-- owner-scoped case at all (data-model.md §8: always references two global
-- points).
--
-- No policy here grants INSERT/UPDATE/DELETE on rows where user_id IS NULL —
-- that only works via the service-role client (apps/web/shared/supabase/admin.ts),
-- which bypasses RLS entirely, matching "only service-role writes those rows".

-- ---------------------------------------------------------------------------
-- vocab_entries
-- ---------------------------------------------------------------------------
alter table public.vocab_entries enable row level security;

create policy "vocab_entries_select_global_or_own" on public.vocab_entries
  for select
  using (user_id is null or auth.uid() = user_id);

-- Regular users may only ever insert/update/delete their OWN custom rows
-- (user_id must equal the caller); global (user_id IS NULL) rows can never
-- satisfy `auth.uid() = user_id`, so they are implicitly unreachable by these
-- policies and only writable via the service-role client.
create policy "vocab_entries_insert_own" on public.vocab_entries
  for insert
  with check (auth.uid() = user_id);

create policy "vocab_entries_update_own" on public.vocab_entries
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "vocab_entries_delete_own" on public.vocab_entries
  for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- grammar_points
-- ---------------------------------------------------------------------------
alter table public.grammar_points enable row level security;

create policy "grammar_points_select_global_or_own" on public.grammar_points
  for select
  using (user_id is null or auth.uid() = user_id);

-- Same reasoning as vocab_entries: user_id IS NULL (the v1 global catalog)
-- rows are only writable via service-role; these policies only ever match a
-- caller's own non-null-user_id rows (forward-compat case per data-model.md,
-- unused by any v1 user story today).
create policy "grammar_points_insert_own" on public.grammar_points
  for insert
  with check (auth.uid() = user_id);

create policy "grammar_points_update_own" on public.grammar_points
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "grammar_points_delete_own" on public.grammar_points
  for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- grammar_confusable_pairs: all authenticated users SELECT; only service-role
-- writes (no insert/update/delete policy for the authenticated role at all).
-- ---------------------------------------------------------------------------
alter table public.grammar_confusable_pairs enable row level security;

create policy "grammar_confusable_pairs_select_all" on public.grammar_confusable_pairs
  for select
  using (auth.role() = 'authenticated');
