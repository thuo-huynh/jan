-- One short reflection and next action per learner per local calendar day.

create table if not exists public.daily_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  review_date date not null,
  note text not null default '',
  tomorrow_task_id uuid references public.tasks(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, review_date)
);

alter table public.daily_reviews enable row level security;

create policy "daily_reviews_own" on public.daily_reviews
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
