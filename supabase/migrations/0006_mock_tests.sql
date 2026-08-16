-- 0006_mock_tests.sql
-- mock_test_results
-- See specs/001-tasknihongo/data-model.md "mock_test_results".

create table if not exists public.mock_test_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  test_date date not null,
  vocab_grammar_score int check (vocab_grammar_score >= 0),
  reading_score int check (reading_score >= 0),
  listening_score int check (listening_score >= 0),
  total_score int check (total_score >= 0),
  created_at timestamptz not null default now()
);

create index if not exists idx_mock_test_results_user_id on public.mock_test_results (user_id);
create index if not exists idx_mock_test_results_test_date on public.mock_test_results (test_date);
