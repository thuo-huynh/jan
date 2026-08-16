-- 0011_rls_owner_scoped.sql
-- RLS policies for owner-scoped tables (data-model.md "RLS Summary").
--
-- Pattern: each table gets RLS enabled + policies scoped to `auth.uid() = user_id`
-- (directly, or via a join to boards.user_id for columns/tasks/task_checklist_items).
-- Admin access does NOT go through a "role = admin" RLS policy here — per research.md
-- §2 and plan.md, admin reads/writes always go through the service-role client
-- (apps/web/shared/supabase/admin.ts), which bypasses RLS entirely. Adding a
-- role-based bypass policy on top would be redundant and widen the RLS surface
-- unnecessarily, so admin-via-service-role is the only admin path.

-- ---------------------------------------------------------------------------
-- profiles: user can SELECT/UPDATE own row only. No INSERT/DELETE policy for
-- regular users — profile rows are created only by the handle_new_user()
-- trigger (SECURITY DEFINER, bypasses RLS) and deleted via auth.users cascade.
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select
  using (auth.uid() = id);

create policy "profiles_update_own" on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- boards: owner-only via user_id.
-- ---------------------------------------------------------------------------
alter table public.boards enable row level security;

create policy "boards_select_own" on public.boards
  for select
  using (auth.uid() = user_id);

create policy "boards_insert_own" on public.boards
  for insert
  with check (auth.uid() = user_id);

create policy "boards_update_own" on public.boards
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "boards_delete_own" on public.boards
  for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- columns: ownership via join to boards.user_id.
-- ---------------------------------------------------------------------------
alter table public.columns enable row level security;

create policy "columns_select_own" on public.columns
  for select
  using (exists (
    select 1 from public.boards b
    where b.id = columns.board_id and b.user_id = auth.uid()
  ));

create policy "columns_insert_own" on public.columns
  for insert
  with check (exists (
    select 1 from public.boards b
    where b.id = columns.board_id and b.user_id = auth.uid()
  ));

create policy "columns_update_own" on public.columns
  for update
  using (exists (
    select 1 from public.boards b
    where b.id = columns.board_id and b.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.boards b
    where b.id = columns.board_id and b.user_id = auth.uid()
  ));

create policy "columns_delete_own" on public.columns
  for delete
  using (exists (
    select 1 from public.boards b
    where b.id = columns.board_id and b.user_id = auth.uid()
  ));

-- ---------------------------------------------------------------------------
-- tasks: ownership via board_id (denormalized on the row itself, per
-- data-model.md, so no join needed) but still validated against boards to
-- ensure board_id actually belongs to the caller.
-- ---------------------------------------------------------------------------
alter table public.tasks enable row level security;

create policy "tasks_select_own" on public.tasks
  for select
  using (exists (
    select 1 from public.boards b
    where b.id = tasks.board_id and b.user_id = auth.uid()
  ));

create policy "tasks_insert_own" on public.tasks
  for insert
  with check (exists (
    select 1 from public.boards b
    where b.id = tasks.board_id and b.user_id = auth.uid()
  ));

create policy "tasks_update_own" on public.tasks
  for update
  using (exists (
    select 1 from public.boards b
    where b.id = tasks.board_id and b.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.boards b
    where b.id = tasks.board_id and b.user_id = auth.uid()
  ));

create policy "tasks_delete_own" on public.tasks
  for delete
  using (exists (
    select 1 from public.boards b
    where b.id = tasks.board_id and b.user_id = auth.uid()
  ));

-- ---------------------------------------------------------------------------
-- task_checklist_items: ownership via join to tasks -> boards.
-- ---------------------------------------------------------------------------
alter table public.task_checklist_items enable row level security;

create policy "task_checklist_items_select_own" on public.task_checklist_items
  for select
  using (exists (
    select 1 from public.tasks t
    join public.boards b on b.id = t.board_id
    where t.id = task_checklist_items.task_id and b.user_id = auth.uid()
  ));

create policy "task_checklist_items_insert_own" on public.task_checklist_items
  for insert
  with check (exists (
    select 1 from public.tasks t
    join public.boards b on b.id = t.board_id
    where t.id = task_checklist_items.task_id and b.user_id = auth.uid()
  ));

create policy "task_checklist_items_update_own" on public.task_checklist_items
  for update
  using (exists (
    select 1 from public.tasks t
    join public.boards b on b.id = t.board_id
    where t.id = task_checklist_items.task_id and b.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.tasks t
    join public.boards b on b.id = t.board_id
    where t.id = task_checklist_items.task_id and b.user_id = auth.uid()
  ));

create policy "task_checklist_items_delete_own" on public.task_checklist_items
  for delete
  using (exists (
    select 1 from public.tasks t
    join public.boards b on b.id = t.board_id
    where t.id = task_checklist_items.task_id and b.user_id = auth.uid()
  ));

-- ---------------------------------------------------------------------------
-- user_vocab_progress: owner-only via user_id.
-- ---------------------------------------------------------------------------
alter table public.user_vocab_progress enable row level security;

create policy "user_vocab_progress_select_own" on public.user_vocab_progress
  for select
  using (auth.uid() = user_id);

create policy "user_vocab_progress_insert_own" on public.user_vocab_progress
  for insert
  with check (auth.uid() = user_id);

create policy "user_vocab_progress_update_own" on public.user_vocab_progress
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "user_vocab_progress_delete_own" on public.user_vocab_progress
  for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- user_grammar_status: owner-only via user_id.
-- ---------------------------------------------------------------------------
alter table public.user_grammar_status enable row level security;

create policy "user_grammar_status_select_own" on public.user_grammar_status
  for select
  using (auth.uid() = user_id);

create policy "user_grammar_status_insert_own" on public.user_grammar_status
  for insert
  with check (auth.uid() = user_id);

create policy "user_grammar_status_update_own" on public.user_grammar_status
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "user_grammar_status_delete_own" on public.user_grammar_status
  for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- reading_logs / listening_logs / mock_test_results / mistake_notebook /
-- notes / review_logs / study_goals: owner-only via user_id.
-- ---------------------------------------------------------------------------
alter table public.reading_logs enable row level security;

create policy "reading_logs_select_own" on public.reading_logs
  for select using (auth.uid() = user_id);
create policy "reading_logs_insert_own" on public.reading_logs
  for insert with check (auth.uid() = user_id);
create policy "reading_logs_update_own" on public.reading_logs
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "reading_logs_delete_own" on public.reading_logs
  for delete using (auth.uid() = user_id);

alter table public.listening_logs enable row level security;

create policy "listening_logs_select_own" on public.listening_logs
  for select using (auth.uid() = user_id);
create policy "listening_logs_insert_own" on public.listening_logs
  for insert with check (auth.uid() = user_id);
create policy "listening_logs_update_own" on public.listening_logs
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "listening_logs_delete_own" on public.listening_logs
  for delete using (auth.uid() = user_id);

alter table public.mock_test_results enable row level security;

create policy "mock_test_results_select_own" on public.mock_test_results
  for select using (auth.uid() = user_id);
create policy "mock_test_results_insert_own" on public.mock_test_results
  for insert with check (auth.uid() = user_id);
create policy "mock_test_results_update_own" on public.mock_test_results
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "mock_test_results_delete_own" on public.mock_test_results
  for delete using (auth.uid() = user_id);

alter table public.mistake_notebook enable row level security;

create policy "mistake_notebook_select_own" on public.mistake_notebook
  for select using (auth.uid() = user_id);
create policy "mistake_notebook_insert_own" on public.mistake_notebook
  for insert with check (auth.uid() = user_id);
create policy "mistake_notebook_update_own" on public.mistake_notebook
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "mistake_notebook_delete_own" on public.mistake_notebook
  for delete using (auth.uid() = user_id);

alter table public.notes enable row level security;

create policy "notes_select_own" on public.notes
  for select using (auth.uid() = user_id);
create policy "notes_insert_own" on public.notes
  for insert with check (auth.uid() = user_id);
create policy "notes_update_own" on public.notes
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "notes_delete_own" on public.notes
  for delete using (auth.uid() = user_id);

alter table public.review_logs enable row level security;

create policy "review_logs_select_own" on public.review_logs
  for select using (auth.uid() = user_id);
create policy "review_logs_insert_own" on public.review_logs
  for insert with check (auth.uid() = user_id);
create policy "review_logs_update_own" on public.review_logs
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "review_logs_delete_own" on public.review_logs
  for delete using (auth.uid() = user_id);

alter table public.study_goals enable row level security;

create policy "study_goals_select_own" on public.study_goals
  for select using (auth.uid() = user_id);
create policy "study_goals_insert_own" on public.study_goals
  for insert with check (auth.uid() = user_id);
create policy "study_goals_update_own" on public.study_goals
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "study_goals_delete_own" on public.study_goals
  for delete using (auth.uid() = user_id);
