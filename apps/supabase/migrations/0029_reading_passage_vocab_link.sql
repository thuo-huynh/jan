-- 0029_reading_passage_vocab_link.sql
-- Adds the link from a custom vocab_entries row back to the reading_passages entry it was
-- attached from (specs/004-reading-comprehension US4) — structurally identical to
-- source_reading_log_id (0013_vocab_reading_log_link.sql) for the reading-log attach-to-SRS flow.

alter table public.vocab_entries
  add column if not exists source_reading_passage_id uuid
    references public.reading_passages (id) on delete set null;

create index if not exists idx_vocab_entries_source_reading_passage_id
  on public.vocab_entries (source_reading_passage_id)
  where source_reading_passage_id is not null;
