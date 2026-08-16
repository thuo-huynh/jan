-- 0013_vocab_reading_log_link.sql
-- Adds the link from a custom vocab_entries row back to the reading_logs
-- entry it was attached from (US4 acceptance scenario 2 / T059). Not present
-- in the original data-model.md sketch — needed so "attach unknown word to
-- SRS" can record provenance without a separate join table.

alter table public.vocab_entries
  add column if not exists source_reading_log_id uuid references public.reading_logs (id) on delete set null;

create index if not exists idx_vocab_entries_source_reading_log_id
  on public.vocab_entries (source_reading_log_id)
  where source_reading_log_id is not null;
