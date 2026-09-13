-- Published shared Flashcard decks are reference data: regular authenticated
-- users may read them but never mutate them. Admin routes use the service
-- role client after requireAdmin(), the same pattern as global vocab entries.

alter table public.shared_flashcard_decks enable row level security;
alter table public.shared_flashcard_deck_entries enable row level security;

create policy "shared_flashcard_decks_select_published" on public.shared_flashcard_decks
  for select
  using (auth.role() = 'authenticated' and is_published);

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
