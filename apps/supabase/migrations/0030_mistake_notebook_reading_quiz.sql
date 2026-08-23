-- 0030_mistake_notebook_reading_quiz.sql
-- Widens mistake_notebook.source to accept 'reading_quiz' (specs/004-reading-comprehension
-- US2/FR-012) alongside the existing 'mock_test'/'manual' values from 0007_mistakes.sql.
-- No new link column: content carries passage/question context as free text, same posture as
-- the existing 'mock_test' source, which also has no dedicated link column (research.md §5).

alter table public.mistake_notebook
  drop constraint if exists mistake_notebook_source_check;

alter table public.mistake_notebook
  add constraint mistake_notebook_source_check
    check (source in ('mock_test', 'manual', 'reading_quiz'));
