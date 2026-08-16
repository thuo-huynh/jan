-- 0010_study_goals.sql
-- study_goals: one row per user, used by lib/study/heatmap.ts.
-- See specs/001-tasknihongo/data-model.md "study_goals" and research.md §10.

create table if not exists public.study_goals (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  daily_grammar_target int not null default 0 check (daily_grammar_target >= 0),
  daily_vocab_target int not null default 0 check (daily_vocab_target >= 0),
  updated_at timestamptz not null default now()
);
