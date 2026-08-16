-- 0005_logs.sql
-- reading_logs / listening_logs
-- See specs/001-tasknihongo/data-model.md "reading_logs" / "listening_logs".

create table if not exists public.reading_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  source text not null,
  passage_type text,
  duration_min int not null check (duration_min >= 0),
  comprehension_score int check (comprehension_score between 0 and 100),
  notes text,
  practiced_at timestamptz not null default now()
);

create index if not exists idx_reading_logs_user_id on public.reading_logs (user_id);
create index if not exists idx_reading_logs_practiced_at on public.reading_logs (practiced_at);
create index if not exists idx_reading_logs_passage_type on public.reading_logs (passage_type);

create table if not exists public.listening_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  source text not null,
  duration_min int not null check (duration_min >= 0),
  comprehension_score int check (comprehension_score between 0 and 100),
  notes text,
  practiced_at timestamptz not null default now()
);

create index if not exists idx_listening_logs_user_id on public.listening_logs (user_id);
create index if not exists idx_listening_logs_practiced_at on public.listening_logs (practiced_at);
