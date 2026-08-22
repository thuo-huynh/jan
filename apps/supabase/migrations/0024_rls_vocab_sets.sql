-- 0024_rls_vocab_sets.sql
-- RLS for vocab_sets — plain owner-scoped table (no global/shared case,
-- unlike vocab_entries), same shape as habits (0016_rls_habits.sql).

alter table public.vocab_sets enable row level security;

create policy "vocab_sets_select_own" on public.vocab_sets
  for select
  using (auth.uid() = user_id);

create policy "vocab_sets_insert_own" on public.vocab_sets
  for insert
  with check (auth.uid() = user_id);

create policy "vocab_sets_update_own" on public.vocab_sets
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "vocab_sets_delete_own" on public.vocab_sets
  for delete
  using (auth.uid() = user_id);
