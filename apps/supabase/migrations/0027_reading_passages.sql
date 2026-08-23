-- 0027_reading_passages.sql
-- reading_passage_sets / reading_passages / reading_passage_questions
-- See specs/004-reading-comprehension/data-model.md.
-- Always user-owned (no user_id IS NULL global catalog, unlike grammar_points) — this feature
-- has no admin-curated reference set, per spec.md's Assumptions.

create table if not exists public.reading_passage_sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_reading_passage_sets_user_id on public.reading_passage_sets (user_id);

create table if not exists public.reading_passages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  set_id uuid references public.reading_passage_sets (id) on delete set null,
  title text not null,
  -- Array of {type:'text', value} | {type:'term', term, reading, meaning} — never raw HTML
  -- (research.md §1). Validated at the application layer (Zod), not a DB check.
  passage_segments jsonb not null,
  translation_vn text,
  tip text,
  created_at timestamptz not null default now()
);

create index if not exists idx_reading_passages_user_id on public.reading_passages (user_id);
create index if not exists idx_reading_passages_set_id on public.reading_passages (set_id);

-- No user_id column: ownership enforced via join to reading_passages.user_id in RLS
-- (0028_rls_reading_passages.sql), same shape as `columns` -> `boards` in 0011_rls_owner_scoped.sql
-- (research.md §7).
create table if not exists public.reading_passage_questions (
  id uuid primary key default gen_random_uuid(),
  passage_id uuid not null references public.reading_passages (id) on delete cascade,
  order_index int not null default 0,
  question_text text not null,
  choices text[] not null,
  correct_choice_index int not null check (correct_choice_index between 0 and 3),
  explanation text not null
);

create index if not exists idx_reading_passage_questions_passage_id
  on public.reading_passage_questions (passage_id);
