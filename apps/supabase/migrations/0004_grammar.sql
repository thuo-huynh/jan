-- 0004_grammar.sql
-- grammar_points (global reference rows when user_id IS NULL)
-- + user_grammar_status (per-user status/notes AND grammar SRS state — data-model.md
--   is explicit that this table carries SRS fields too, not just status/notes)
-- + grammar_confusable_pairs (global reference join table; RLS added in 0012).
-- See specs/001-tasknihongo/data-model.md "grammar_points" / "user_grammar_status" /
-- "grammar_confusable_pairs" and research.md §3, §8.

create table if not exists public.grammar_points (
  id uuid primary key default gen_random_uuid(),
  -- NULL = one of the ~200 global N2 reference points; non-null reserved for
  -- forward compatibility (not used by any v1 user story per data-model.md).
  user_id uuid references public.profiles (id) on delete cascade,
  pattern text not null,
  meaning text not null,
  connection_form text,
  formality_nuance text,
  example_sentences text[] not null default '{}',
  jlpt_level text not null default 'N2',
  frequency_tag text,
  n3_overlap boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_grammar_points_user_id on public.grammar_points (user_id);
create index if not exists idx_grammar_points_n3_overlap on public.grammar_points (n3_overlap);

create table if not exists public.user_grammar_status (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  grammar_point_id uuid not null references public.grammar_points (id) on delete cascade,
  status text not null default 'not_started' check (status in ('not_started', 'learning', 'mastered')),
  notes_user text,
  -- Nullable until the point's first review (research.md §3: grammar joins the
  -- blended SRS review queue but a point without a row is implicitly not-yet-reviewed).
  srs_due_date date,
  srs_interval int,
  srs_ease numeric,
  srs_repetitions int not null default 0,
  fail_count int not null default 0,
  updated_at timestamptz not null default now(),
  unique (user_id, grammar_point_id)
);

create index if not exists idx_user_grammar_status_user_id on public.user_grammar_status (user_id);
create index if not exists idx_user_grammar_status_grammar_point_id on public.user_grammar_status (grammar_point_id);
create index if not exists idx_user_grammar_status_status on public.user_grammar_status (status);
-- Powers the blended review-queue "due today" lookup for grammar items.
create index if not exists idx_user_grammar_status_srs_due_date on public.user_grammar_status (user_id, srs_due_date);

create table if not exists public.grammar_confusable_pairs (
  id uuid primary key default gen_random_uuid(),
  grammar_point_id_a uuid not null references public.grammar_points (id) on delete cascade,
  grammar_point_id_b uuid not null references public.grammar_points (id) on delete cascade,
  comparison_note text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_grammar_confusable_pairs_a on public.grammar_confusable_pairs (grammar_point_id_a);
create index if not exists idx_grammar_confusable_pairs_b on public.grammar_confusable_pairs (grammar_point_id_b);
