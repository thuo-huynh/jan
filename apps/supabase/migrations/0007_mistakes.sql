-- 0007_mistakes.sql
-- mistake_notebook
-- See specs/001-tasknihongo/data-model.md "mistake_notebook".
-- Link columns are ON DELETE SET NULL so a mistake entry survives deletion of
-- the vocab/grammar item it referenced (FR-030).

create table if not exists public.mistake_notebook (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  source text not null check (source in ('mock_test', 'manual')),
  content text not null,
  linked_vocab_id uuid references public.vocab_entries (id) on delete set null,
  linked_grammar_id uuid references public.grammar_points (id) on delete set null,
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_mistake_notebook_user_id on public.mistake_notebook (user_id);
create index if not exists idx_mistake_notebook_resolved on public.mistake_notebook (resolved);
create index if not exists idx_mistake_notebook_linked_vocab_id on public.mistake_notebook (linked_vocab_id);
create index if not exists idx_mistake_notebook_linked_grammar_id on public.mistake_notebook (linked_grammar_id);
