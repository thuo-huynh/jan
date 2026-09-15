-- JanGo: shared Flashcard decks
-- Run this once in Supabase Dashboard → SQL Editor.
-- Safe to run again: every table, index, trigger, and policy is guarded.

create table if not exists public.shared_flashcard_decks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  jlpt_level text,
  labels text[] not null default '{}',
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_shared_flashcard_decks_published
  on public.shared_flashcard_decks (is_published, created_at desc);
create index if not exists idx_shared_flashcard_decks_jlpt_level
  on public.shared_flashcard_decks (jlpt_level);
create index if not exists idx_shared_flashcard_decks_labels
  on public.shared_flashcard_decks using gin (labels);

create table if not exists public.shared_flashcard_deck_entries (
  deck_id uuid not null references public.shared_flashcard_decks (id) on delete cascade,
  vocab_id uuid not null references public.vocab_entries (id) on delete cascade,
  position int not null default 0 check (position >= 0),
  primary key (deck_id, vocab_id),
  unique (deck_id, position)
);

create index if not exists idx_shared_flashcard_deck_entries_deck_position
  on public.shared_flashcard_deck_entries (deck_id, position);
create index if not exists idx_shared_flashcard_deck_entries_vocab
  on public.shared_flashcard_deck_entries (vocab_id);

create or replace function public.validate_shared_flashcard_deck_vocab()
returns trigger
language plpgsql
as $$
begin
  if not exists (
    select 1
    from public.vocab_entries
    where id = new.vocab_id
      and user_id is null
  ) then
    raise exception 'Shared flashcard decks can only contain global vocabulary entries';
  end if;

  return new;
end;
$$;

drop trigger if exists shared_flashcard_deck_entries_global_vocab_only on public.shared_flashcard_deck_entries;
create trigger shared_flashcard_deck_entries_global_vocab_only
before insert or update of vocab_id on public.shared_flashcard_deck_entries
for each row execute function public.validate_shared_flashcard_deck_vocab();

alter table public.shared_flashcard_decks enable row level security;
alter table public.shared_flashcard_deck_entries enable row level security;

drop policy if exists "shared_flashcard_decks_select_published" on public.shared_flashcard_decks;
create policy "shared_flashcard_decks_select_published" on public.shared_flashcard_decks
  for select
  using (auth.role() = 'authenticated' and is_published);

drop policy if exists "shared_flashcard_deck_entries_select_published" on public.shared_flashcard_deck_entries;
create policy "shared_flashcard_deck_entries_select_published" on public.shared_flashcard_deck_entries
  for select
  using (
    auth.role() = 'authenticated'
    and exists (
      select 1
      from public.shared_flashcard_decks decks
      where decks.id = deck_id
        and decks.is_published
    )
  );
