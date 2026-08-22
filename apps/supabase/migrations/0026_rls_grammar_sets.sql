-- 0026_rls_grammar_sets.sql
-- RLS for grammar_sets — owner-scoped, same shape as vocab_sets (0024_rls_vocab_sets.sql).

alter table public.grammar_sets enable row level security;

create policy "grammar_sets_select_own" on public.grammar_sets
  for select
  using (auth.uid() = user_id);

create policy "grammar_sets_insert_own" on public.grammar_sets
  for insert
  with check (auth.uid() = user_id);

create policy "grammar_sets_update_own" on public.grammar_sets
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "grammar_sets_delete_own" on public.grammar_sets
  for delete
  using (auth.uid() = user_id);
