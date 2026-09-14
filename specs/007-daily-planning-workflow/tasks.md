# Tasks: Daily Planning Workflow

**Input**: `spec.md`, `plan.md`, `research.md`, `data-model.md`, `contracts/`, and `quickstart.md`

**Tests**: TDD is required by the implementation plan.

## Phase 1: Setup

- [ ] T001 Add source-level planning and recurrence test files in `apps/web/tests/unit/daily-task-planning.test.mjs` and `apps/web/tests/unit/recurrence.test.mjs`.

## Phase 2: Foundations

- [ ] T002 Add estimate storage and validation in `apps/supabase/migrations/0038_task_planning_metadata.sql`, `apps/web/features/kanban/types.ts`, and `apps/web/shared/validation/schemas.ts`.
- [ ] T003 Add local date/planner helpers in `apps/web/features/kanban/lib/dates.ts` and `apps/web/features/kanban/lib/planner.ts`.

## Phase 3: User Story 1 — Plan and act today (P1)

**Independent test**: A learner opens Today, adds a dated study task with estimate, and can open it from the prioritized list.

- [ ] T004 [US1] Write failing Today/Quick Add source tests in `apps/web/tests/unit/daily-tasks-navigation.test.mjs`.
- [ ] T005 [US1] Add enriched task projections and estimate edit in `apps/web/app/(app)/boards/page.tsx` and `apps/web/features/kanban/components/TaskDetailModal.tsx`.
- [ ] T006 [US1] Add task estimate/card metadata UI in `apps/web/features/kanban/components/TaskCard.tsx`.
- [ ] T007 [US1] Create daily view switcher, Today, and Quick Add components in `apps/web/features/kanban/components/`.
- [ ] T008 [US1] Integrate the Today workspace and Quick Add mutation in `apps/web/features/kanban/components/Board.tsx`.

## Phase 4: User Story 2 — Plan across Calendar and Board (P1)

**Independent test**: Dragging a task to another Calendar day changes only its due date and survives refresh.

- [ ] T009 [US2] Write failing Calendar target and rollback tests in `apps/web/tests/unit/daily-task-calendar.test.mjs`.
- [ ] T010 [US2] Add namespaced Calendar drop targets in `apps/web/features/kanban/components/DailyTaskCalendar.tsx`.
- [ ] T011 [US2] Integrate Calendar drop/update/rollback in `apps/web/features/kanban/components/Board.tsx`.

## Phase 5: User Story 3 — Find work quickly (P1)

**Independent test**: Each quick filter returns matching tasks and global clear restores all tasks.

- [ ] T012 [US3] Write failing quick-filter predicate/reset tests in `apps/web/tests/unit/daily-task-planning.test.mjs`.
- [ ] T013 [US3] Reconcile and extend filters in `apps/web/features/kanban/components/BoardFilters.tsx` and `apps/web/features/kanban/components/Board.tsx` without overwriting user changes.

## Phase 6: User Story 4 — Templates and routines (P2)

- [ ] T014 [US4] Write failing cadence/idempotence tests in `apps/web/tests/unit/recurrence.test.mjs`.
- [ ] T015 [US4] Add template/schedule schema, RLS, and materialization RPC in `apps/supabase/migrations/0039_task_templates.sql`, `0040_task_recurrence_schedules.sql`, and `0043_daily_task_planning_rls_and_functions.sql`.
- [ ] T016 [US4] Add recurrence types, validation, and helpers in `apps/web/features/kanban/types.ts`, `apps/web/shared/validation/schemas.ts`, and `apps/web/features/kanban/lib/recurrence.ts`.
- [ ] T017 [US4] Build routine UI in `apps/web/features/kanban/components/TaskTemplatesPanel.tsx`, `TaskDetailModal.tsx`, and `Board.tsx`.

## Phase 7: User Story 5 — Guided presets (P2)

- [ ] T018 [US5] Add fixed preset persistence/RLS in `apps/supabase/migrations/0042_daily_task_automation_presets.sql`.
- [ ] T019 [US5] Build preset catalogue and completion/overdue integrations in `apps/web/features/kanban/components/AutomationPresetsPanel.tsx` and `Board.tsx`.

## Phase 8: User Story 6 — Focus Planner (P3)

- [ ] T020 [US6] Write failing focus-slot and duration tests in `apps/web/tests/unit/daily-task-planning.test.mjs`.
- [ ] T021 [US6] Add focus-block schema/RLS in `apps/supabase/migrations/0041_focus_blocks.sql` and `0043_daily_task_planning_rls_and_functions.sql`.
- [ ] T022 [US6] Fetch focus blocks in `apps/web/app/(app)/boards/page.tsx` and add types in `apps/web/features/kanban/types.ts`.
- [ ] T023 [US6] Implement accessible day/week Planner in `apps/web/features/kanban/components/FocusPlanner.tsx` and integrate it in `Board.tsx`.

## Phase 9: Validation

- [ ] T024 Run `node --test`, `npm run format:check`, `npm run lint`, and `npm run build` from `apps/web`.
- [ ] T025 Perform and record the manual matrix in `specs/007-daily-planning-workflow/quickstart.md`.

## Dependencies

`T001 → T002/T003 → T004–T013 → T014–T019 → T020–T023 → T024/T025`. Phase 3 is the MVP; subsequent phases extend the same Daily Board data without duplicating it.
