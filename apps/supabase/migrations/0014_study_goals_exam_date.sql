-- 0014_study_goals_exam_date.sql
-- Adds exam_date to study_goals (T063) — the "days remaining" countdown
-- widget (T064, FR: US5 acceptance scenario 3) needs somewhere to persist
-- the user's exam date. Reusing the existing one-row-per-user study_goals
-- table per tasks.md T063's guidance, rather than adding a new table.

alter table public.study_goals
  add column if not exists exam_date date;
