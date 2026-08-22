-- 0023_vocab_sets.sql
-- Quizlet-style "study sets" for a user's own custom vocab entries — groups
-- them so the Vocab page shows a browsable list of named sets instead of one
-- long flat list every custom word gets appended to (the more words you add,
-- the more scrolling to find anything). Global (user_id IS NULL) N2 catalog
-- entries never belong to a set; `vocab_entries.set_id` only makes sense on
-- a caller's own rows.

create table if not exists public.vocab_sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_vocab_sets_user_id on public.vocab_sets (user_id);

alter table public.vocab_entries
  add column if not exists set_id uuid references public.vocab_sets (id) on delete set null;

create index if not exists idx_vocab_entries_set_id on public.vocab_entries (set_id);

-- Backfill: every existing custom entry (added before sets existed) gets
-- grouped into a per-user "Chưa phân loại" (Uncategorized) set so nothing
-- goes missing when the Vocab page switches from a flat list to set-grouped
-- browsing. Users can rename or split it afterward.
insert into public.vocab_sets (user_id, name)
select distinct user_id, 'Chưa phân loại'
from public.vocab_entries
where user_id is not null
  and set_id is null;

update public.vocab_entries ve
set set_id = vs.id
from public.vocab_sets vs
where ve.user_id is not null
  and ve.set_id is null
  and vs.user_id = ve.user_id
  and vs.name = 'Chưa phân loại';
