-- 0001_profiles.sql
-- profiles table (mirrors auth.users) + trigger to auto-create a profile on signup.
-- See specs/001-tasknihongo/data-model.md "profiles" and research.md §1/§2.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  role text not null default 'user' check (role in ('user', 'admin')),
  status text not null default 'active' check (status in ('active', 'suspended')),
  created_at timestamptz not null default now(),
  last_active_at timestamptz not null default now()
);

comment on table public.profiles is 'One row per auth.users row; mirrors email and carries app-level role/status.';

create index if not exists idx_profiles_role on public.profiles (role);
create index if not exists idx_profiles_status on public.profiles (status);

-- Standard Supabase pattern: sync a profiles row whenever a new auth.users row
-- is created. SECURITY DEFINER so it can insert into public.profiles despite
-- running in the auth.users insert context (which is not the new user's own
-- session yet).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, role, status)
  values (new.id, new.email, 'user', 'active')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute procedure public.handle_new_user();
