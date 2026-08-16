-- 0008_notes.sql
-- notes (freeform markdown notes) with a generated full-text search column.
-- See specs/001-tasknihongo/data-model.md "notes" and research.md §6.
--
-- Deviation from data-model.md wording: the generated tsvector uses the
-- 'simple' text search configuration rather than 'english'. Note content is
-- expected to be a mix of Japanese text (which English stemming/stopwords do
-- not meaningfully apply to) and English/Vietnamese study notes, so 'simple'
-- (no stemming, no stopword removal) avoids 'english' silently dropping
-- short tokens that matter for search here. Functionally this is still the
-- "generated tsvector column + GIN index" design research.md/data-model.md
-- specify; only the search configuration differs.

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null default '',
  body_markdown text not null default '',
  folder text,
  tags text[] not null default '{}',
  pinned boolean not null default false,
  linked_task_id uuid references public.tasks (id) on delete set null,
  linked_vocab_id uuid references public.vocab_entries (id) on delete set null,
  search_vector tsvector generated always as (
    setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(body_markdown, '')), 'B')
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_notes_user_id on public.notes (user_id);
create index if not exists idx_notes_folder on public.notes (folder);
create index if not exists idx_notes_pinned on public.notes (pinned);
create index if not exists idx_notes_linked_task_id on public.notes (linked_task_id);
create index if not exists idx_notes_linked_vocab_id on public.notes (linked_vocab_id);
create index if not exists idx_notes_tags on public.notes using gin (tags);
create index if not exists idx_notes_search_vector on public.notes using gin (search_vector);
