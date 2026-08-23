-- 0028_rls_reading_passages.sql
-- RLS for reading_passage_sets / reading_passages (owner-scoped via user_id, same shape as
-- 0026_rls_grammar_sets.sql) and reading_passage_questions (owner-scoped via a join to
-- reading_passages.user_id, same shape as `columns` -> `boards` in 0011_rls_owner_scoped.sql).

alter table public.reading_passage_sets enable row level security;

create policy "reading_passage_sets_select_own" on public.reading_passage_sets
  for select
  using (auth.uid() = user_id);

create policy "reading_passage_sets_insert_own" on public.reading_passage_sets
  for insert
  with check (auth.uid() = user_id);

create policy "reading_passage_sets_update_own" on public.reading_passage_sets
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "reading_passage_sets_delete_own" on public.reading_passage_sets
  for delete
  using (auth.uid() = user_id);

alter table public.reading_passages enable row level security;

create policy "reading_passages_select_own" on public.reading_passages
  for select
  using (auth.uid() = user_id);

create policy "reading_passages_insert_own" on public.reading_passages
  for insert
  with check (auth.uid() = user_id);

create policy "reading_passages_update_own" on public.reading_passages
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "reading_passages_delete_own" on public.reading_passages
  for delete
  using (auth.uid() = user_id);

alter table public.reading_passage_questions enable row level security;

create policy "reading_passage_questions_select_own" on public.reading_passage_questions
  for select
  using (exists (
    select 1 from public.reading_passages p
    where p.id = reading_passage_questions.passage_id and p.user_id = auth.uid()
  ));

create policy "reading_passage_questions_insert_own" on public.reading_passage_questions
  for insert
  with check (exists (
    select 1 from public.reading_passages p
    where p.id = reading_passage_questions.passage_id and p.user_id = auth.uid()
  ));

create policy "reading_passage_questions_update_own" on public.reading_passage_questions
  for update
  using (exists (
    select 1 from public.reading_passages p
    where p.id = reading_passage_questions.passage_id and p.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.reading_passages p
    where p.id = reading_passage_questions.passage_id and p.user_id = auth.uid()
  ));

create policy "reading_passage_questions_delete_own" on public.reading_passage_questions
  for delete
  using (exists (
    select 1 from public.reading_passages p
    where p.id = reading_passage_questions.passage_id and p.user_id = auth.uid()
  ));
