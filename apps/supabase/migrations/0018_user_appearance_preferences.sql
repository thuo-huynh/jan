-- 0018_user_appearance_preferences.sql
-- user_appearance_preferences: one row per user (data-model.md
-- "user_appearance_preferences"), same one-row-per-user shape as
-- study_goals (0010_study_goals.sql). theme_id is nullable + ON DELETE SET
-- NULL so deleting a theme an admin manages doesn't break a user's row
-- (FR-017) — the app resolves NULL to the default theme at render time.

create table if not exists public.user_appearance_preferences (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  theme_id uuid references public.themes (id) on delete set null,
  mode text not null default 'light' check (mode in ('light', 'dark')),
  updated_at timestamptz not null default now()
);
