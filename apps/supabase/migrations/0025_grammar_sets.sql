-- 0025_grammar_sets.sql
-- Same "study sets" grouping as vocab_sets (0023_vocab_sets.sql), for a
-- user's own custom grammar points — lets a bulk HTML import group patterns
-- by their source tab (e.g. "Ngữ pháp hay dùng trong IT/BrSE", "Mẫu so
-- sánh") instead of dumping everything into one undifferentiated list.
-- Global (user_id IS NULL) grammar_points never belong to a set.

create table if not exists public.grammar_sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_grammar_sets_user_id on public.grammar_sets (user_id);

alter table public.grammar_points
  add column if not exists set_id uuid references public.grammar_sets (id) on delete set null;

create index if not exists idx_grammar_points_set_id on public.grammar_points (set_id);

-- Backfill: any custom grammar point added before sets existed (via the
-- single-entry form shipped ahead of this migration) gets grouped into a
-- per-user "Chưa phân loại" set, same convention as vocab's backfill.
insert into public.grammar_sets (user_id, name)
select distinct user_id, 'Chưa phân loại'
from public.grammar_points
where user_id is not null
  and set_id is null;

update public.grammar_points gp
set set_id = gs.id
from public.grammar_sets gs
where gp.user_id is not null
  and gp.set_id is null
  and gs.user_id = gp.user_id
  and gs.name = 'Chưa phân loại';
