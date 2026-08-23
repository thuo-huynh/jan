-- 0031_reading_question_progress.sql
-- Per-user answer state for reading_passage_questions — added because grading was originally
-- ephemeral client-only state (specs/004-reading-comprehension/research.md §4), but users need
-- the answered/correct/wrong highlight to survive collapsing the passage or reloading the page.
-- One row per (user, question); a retry/re-answer overwrites the row rather than versioning it —
-- this reflects "what did I last answer", not full attempt history.

create table if not exists public.user_reading_question_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  question_id uuid not null references public.reading_passage_questions (id) on delete cascade,
  chosen_choice_index int not null check (chosen_choice_index between 0 and 3),
  is_correct boolean not null,
  answered_at timestamptz not null default now(),
  unique (user_id, question_id)
);

create index if not exists idx_user_reading_question_progress_user_id
  on public.user_reading_question_progress (user_id);
create index if not exists idx_user_reading_question_progress_question_id
  on public.user_reading_question_progress (question_id);
