-- 0032_rls_reading_question_progress.sql
-- RLS for user_reading_question_progress — owner-scoped via user_id directly (the row already
-- carries user_id, no join needed), same shape as user_grammar_status's own policies.

alter table public.user_reading_question_progress enable row level security;

create policy "user_reading_question_progress_select_own" on public.user_reading_question_progress
  for select
  using (auth.uid() = user_id);

create policy "user_reading_question_progress_insert_own" on public.user_reading_question_progress
  for insert
  with check (auth.uid() = user_id);

create policy "user_reading_question_progress_update_own" on public.user_reading_question_progress
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "user_reading_question_progress_delete_own" on public.user_reading_question_progress
  for delete
  using (auth.uid() = user_id);
