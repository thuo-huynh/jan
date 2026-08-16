-- 0009_review_logs.sql
-- review_logs: one row per graded SRS review (vocab/kanji or grammar).
-- See specs/001-tasknihongo/data-model.md "review_logs" and contracts/api.md
-- POST /api/reviews.
--
-- vocab_id/grammar_id use ON DELETE CASCADE (not SET NULL): the table's check
-- constraint requires exactly one of the two to be non-null at all times, so a
-- SET NULL on delete could leave a row with both null and violate the
-- constraint. Deleting the underlying item's review history along with the
-- item itself is the only option consistent with that constraint.

create table if not exists public.review_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  vocab_id uuid references public.vocab_entries (id) on delete cascade,
  grammar_id uuid references public.grammar_points (id) on delete cascade,
  reviewed_at timestamptz not null default now(),
  result text not null check (result in ('again', 'hard', 'good', 'easy')),
  constraint review_logs_exactly_one_item check (
    (vocab_id is not null and grammar_id is null) or
    (vocab_id is null and grammar_id is not null)
  )
);

create index if not exists idx_review_logs_user_id on public.review_logs (user_id);
create index if not exists idx_review_logs_vocab_id on public.review_logs (vocab_id);
create index if not exists idx_review_logs_grammar_id on public.review_logs (grammar_id);
create index if not exists idx_review_logs_reviewed_at on public.review_logs (reviewed_at);
-- Powers per-user streak/heatmap aggregation grouped by local calendar day.
create index if not exists idx_review_logs_user_id_reviewed_at on public.review_logs (user_id, reviewed_at);
