-- 0003_vocab.sql
-- vocab_entries (global reference rows when user_id IS NULL, custom rows otherwise)
-- + user_vocab_progress (lazily-created per-user SRS state against a global row).
-- See specs/001-tasknihongo/data-model.md "vocab_entries" / "user_vocab_progress"
-- and research.md §7 (lazy per-user progress rows).

create table if not exists public.vocab_entries (
  id uuid primary key default gen_random_uuid(),
  -- NULL = global/shared N2 reference entry; non-null = a user's own custom entry.
  user_id uuid references public.profiles (id) on delete cascade,
  word text not null,
  reading text,
  meaning text not null,
  example text,
  jlpt_level text,
  is_kanji boolean not null default false,
  srs_due_date date not null default current_date,
  srs_interval int not null default 0,
  srs_ease numeric not null default 2.5,
  srs_repetitions int not null default 0,
  fail_count int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_vocab_entries_user_id on public.vocab_entries (user_id);
create index if not exists idx_vocab_entries_is_kanji on public.vocab_entries (is_kanji);
-- Powers the review-queue "due today" lookup for a user's own custom entries.
create index if not exists idx_vocab_entries_srs_due_date on public.vocab_entries (srs_due_date) where user_id is not null;

create table if not exists public.user_vocab_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  vocab_id uuid not null references public.vocab_entries (id) on delete cascade,
  srs_due_date date not null default current_date,
  srs_interval int not null default 0,
  srs_ease numeric not null default 2.5,
  srs_repetitions int not null default 0,
  fail_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, vocab_id)
);

create index if not exists idx_user_vocab_progress_user_id on public.user_vocab_progress (user_id);
create index if not exists idx_user_vocab_progress_vocab_id on public.user_vocab_progress (vocab_id);
-- Powers the blended review-queue "due today" lookup for global reference items.
create index if not exists idx_user_vocab_progress_srs_due_date on public.user_vocab_progress (user_id, srs_due_date);
