# Daily Planning Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the existing hidden Daily Board into a coherent Today, Calendar, Board, and focus-time Planner workflow, with recurring study routines and safe built-in automation presets.

**Architecture:** The existing Daily Board remains the sole task source of truth. `BoardView` becomes a daily workspace that projects the same tasks into multiple views, while new template/schedule/focus-block tables extend rather than duplicate tasks. Calendar and Planner are namespaced drop targets within the existing DnD context, and every direct client mutation optimistically updates then rolls back on failure.

**Tech Stack:** Next.js 14 App Router, React 18, TypeScript 5, Supabase/PostgreSQL/RLS, Zod 4, `@dnd-kit`, Lucide, Node built-in tests.

**Spec:** [spec.md](spec.md)

## Global Constraints

- New SQL migrations are sequential and address one concern each; existing tasks, non-daily boards, and checklist rows remain intact.
- All new UI copy and accessible labels are Vietnamese and use `DESIGN.md` tokens/primitives.
- Tasks are personal: there is no external-calendar sync, team behavior, background cron, or general rule builder.
- A failed mutation restores the prior visible task/block snapshot and announces a Vietnamese error.
- Do not overwrite the user's pre-existing changes to `BoardFilters.tsx` or `Column.tsx`.

---

## Project Structure

```text
apps/supabase/migrations/
├── 0038_task_planning_metadata.sql
├── 0039_task_templates.sql
├── 0040_task_recurrence_schedules.sql
├── 0041_focus_blocks.sql
├── 0042_daily_task_automation_presets.sql
└── 0043_daily_task_planning_rls_and_functions.sql
apps/web/app/(app)/boards/page.tsx
apps/web/features/kanban/{types.ts,lib/{dates,planner,recurrence}.ts,components/}
apps/web/shared/validation/schemas.ts
apps/web/tests/unit/{daily-task-planning,recurrence}.test.mjs
```

### Task 1: Add planning metadata and validation

**Files:**
- Create: `apps/supabase/migrations/0038_task_planning_metadata.sql`
- Create: `apps/web/features/kanban/lib/dates.ts`
- Modify: `apps/web/features/kanban/types.ts`
- Modify: `apps/web/shared/validation/schemas.ts`
- Test: `apps/web/tests/unit/daily-task-planning.test.mjs`

**Interfaces:** `BoardTask.estimated_minutes: number | null`; `taskPlanningSchema`; `toDateKey(date): string` and `isDateKey(value): boolean`.

- [ ] Add failing tests that accept `25`, reject `4`/`721`, and assert a local midnight date becomes `YYYY-MM-DD` without timezone drift.
- [ ] Add nullable `tasks.estimated_minutes smallint check (estimated_minutes between 5 and 720)` plus a board/date index; run the migration against a disposable project.
- [ ] Extend `BoardTask` and `taskSchema` with `estimatedMinutes` and implement pure local-date helpers.
- [ ] Run `node --test tests/unit/daily-task-planning.test.mjs` from `apps/web`; expect PASS.
- [ ] Commit only Task 1 files with `feat: add task planning metadata`.

### Task 2: Preserve enriched task data end-to-end

**Files:**
- Modify: `apps/web/app/(app)/boards/page.tsx`
- Modify: `apps/web/features/kanban/components/{Board,TaskCard,TaskDetailModal}.tsx`
- Test: `apps/web/tests/unit/daily-task-planning.test.mjs`

**Interfaces:** all task projections include `estimated_minutes`; cards render due state → checklist progress → estimate → tags.

- [ ] Write assertions that the Daily Board server select, insert, and modal update select contain `estimated_minutes`.
- [ ] Add estimate edit/save to the task modal, validated by `taskSchema`; update Board state only after success.
- [ ] Render an estimate badge only when non-null and reorder applicable metadata without color-only semantics.
- [ ] Run the task tests, lint, and manually verify an existing null estimate renders unchanged.
- [ ] Commit with `feat: show task estimates`.

### Task 3: Ship Today, view switching, and Quick Add

**Files:**
- Create: `apps/web/features/kanban/components/{DailyTaskViewSwitcher,DailyTaskToday,DailyTaskQuickAdd}.tsx`
- Modify: `apps/web/features/kanban/components/Board.tsx`
- Modify: `apps/web/tests/unit/daily-tasks-navigation.test.mjs`

**Interfaces:** `DailyTaskView = 'today' | 'calendar' | 'board' | 'planner'`; Quick Add consumes `selectedDate`, `columns`, and `onCreate({ title, columnId, dueDate, tags, estimatedMinutes })`.

- [ ] Write failing tests that Daily mode defaults to Today, exposes the four Vietnamese view labels, and Quick Add submits the selected date/estimate.
- [ ] Use a URL-backed view value and render the switcher only for `dailyMode`; preserve existing non-daily board markup.
- [ ] Implement Today groups in the order overdue, selected-day, next-upcoming; reuse `TaskCard` and its detail callback.
- [ ] Implement accessible Quick Add with title, date, status, tags, estimate, cancel, submit, and existing insert/rollback behavior.
- [ ] Run navigation and planning tests; commit `feat: add daily task workspace views`.

### Task 4: Support Calendar drop-to-reschedule

**Files:**
- Modify: `apps/web/features/kanban/components/{Board,DailyTaskCalendar}.tsx`
- Modify: `apps/web/tests/unit/daily-task-calendar.test.mjs`

**Interfaces:** valid Calendar target is `calendar-day:${YYYY-MM-DD}` with `{ type: 'calendar-day', date }`.

- [ ] Write failing assertions for namespaced day target data and Board's date-only persistence update.
- [ ] Place Calendar inside the Daily DnD context. Attach `useDroppable` to each date-cell wrapper while retaining a button for date selection.
- [ ] In `handleDragEnd`, handle Calendar before column logic: update only `due_date` and `updated_at`, set selected date, and restore `snapshotRef` with an `aria-live` Vietnamese error on failure.
- [ ] Keep `handleDragOver` from changing status/order when hovering a Calendar target.
- [ ] Manually test undated-to-dated, date-to-date, click selection, refresh persistence, and forced error rollback; commit `feat: reschedule tasks from calendar`.

### Task 5: Complete filters and recovery states

**Files:**
- Modify: `apps/web/features/kanban/components/{Board,BoardFilters}.tsx`
- Test: `apps/web/tests/unit/daily-task-planning.test.mjs`

**Interfaces:** quick values `today`, `overdue`, `this-week`, `incomplete`, and `study` compose with existing detailed filters and have a single reset.

- [ ] First inspect and preserve the existing dirty `BoardFilters.tsx` implementation.
- [ ] Add failing tests for each predicate, active pressed state, empty result reset, and global clear.
- [ ] Add quick filter controls and derive their predicates from due date, column completion selection, and study tag without deleting detailed filters.
- [ ] Add Vietnamese `aria-live` messages for creation/move errors and a useful no-results reset action.
- [ ] Run tests at 320px/desktop keyboard paths; commit only reconciled files with `feat: add daily task quick filters`.

### Task 6: Persist templates and idempotent recurrence

**Files:**
- Create: `apps/supabase/migrations/{0039_task_templates,0040_task_recurrence_schedules,0043_daily_task_planning_rls_and_functions}.sql`
- Create: `apps/web/features/kanban/lib/recurrence.ts`
- Modify: `apps/web/features/kanban/{types.ts}` and `apps/web/shared/validation/schemas.ts`
- Test: `apps/web/tests/unit/recurrence.test.mjs`

**Interfaces:** `TaskTemplate`, `TaskRecurrenceSchedule`; `materialize_due_task_occurrences()`; unique occurrence key `(recurrence_schedule_id, scheduled_occurrence_date)`.

- [ ] Write pure recurrence tests for daily, weekdays, weekly, monthly, pause, template edit, and duplicate occurrence dates.
- [ ] Create owner-bound template/checklist/schedule storage with archive/pause states. Add task recurrence references and a partial unique occurrence index.
- [ ] Implement a SECURITY INVOKER RPC with no user/date parameters: derive `auth.uid()`, transactionally insert only due instances/checklists, conflict-ignore duplicates, and advance next occurrence.
- [ ] Add direct and join-based RLS plus database checks/triggers preventing foreign board, column, template, or schedule links. Revoke public RPC execution and grant authenticated only.
- [ ] Run pure tests and local Supabase two-tab/RLS matrix when available; commit `feat: add recurring task routines`.

### Task 7: Expose templates, schedules, and fixed presets

**Files:**
- Create: `apps/web/features/kanban/components/{TaskTemplatesPanel,AutomationPresetsPanel}.tsx`
- Create: `apps/supabase/migrations/0042_daily_task_automation_presets.sql`
- Modify: `apps/web/app/(app)/boards/page.tsx`
- Modify: `apps/web/features/kanban/components/{Board,TaskCard,TaskDetailModal}.tsx`

**Interfaces:** preset types are `recurring-routine`, `complete-to-column`, `overdue-review`; only the completion preset stores a selected column id.

- [ ] Write failing source checks for fixed preset names and the absence of free-form trigger/action controls.
- [ ] Materialize recurrences on Daily Tasks entry and an explicit refresh; rehydrate task state from returned/new data without duplicate cards.
- [ ] Add template save, schedule cadence/start/weekday editor, and pause/resume/delete actions. Show repeat state and next occurrence on generated task cards.
- [ ] Add the three preset cards with Vietnamese trigger/action description. Completion moves to a selected column only on explicit action; overdue review is read-only.
- [ ] Test paused/deleted schedules, altered future template snapshot, missing permission, and non-daily regression; commit `feat: add task routine controls`.

### Task 8: Add Planner persistence and accessible time blocks

**Files:**
- Create: `apps/supabase/migrations/0041_focus_blocks.sql`
- Create: `apps/web/features/kanban/lib/planner.ts`
- Create: `apps/web/features/kanban/components/FocusPlanner.tsx`
- Modify: `apps/web/app/(app)/boards/page.tsx`
- Modify: `apps/web/features/kanban/components/{Board,TaskDetailModal}.tsx`
- Modify: `apps/web/features/kanban/types.ts`

**Interfaces:** `FocusBlock { id, task_id, starts_at, ends_at }`; slot id `planner-slot:${YYYY-MM-DD}:${HH:mm}`; 30-minute slots.

- [ ] Write failing helper tests for default 25-minute task duration rounded to a Planner slot, block end-after-start, and week boundaries.
- [ ] Add `focus_blocks` with task FK, timestamps, end-after-start check, time/task indexes, and task-to-board owner RLS.
- [ ] Fetch blocks solely in the Daily route and render day plus horizontally-scrollable week grids. Drop a task into a slot to create/move a block without touching due date.
- [ ] Add labelled menu actions to move time/date, shorten/lengthen 30 minutes, unlink, and delete; never rely on pointer-only resizing.
- [ ] Verify refresh persistence and that delete/unlink retains task; commit `feat: add focus time planner`.

### Task 9: Run the full verification matrix

**Files:**
- Modify: `specs/007-daily-planning-workflow/quickstart.md`
- Modify: `apps/web/tests/unit/{daily-task-calendar,daily-tasks-navigation,daily-task-planning,recurrence}.test.mjs`

- [ ] Execute `node --test tests/unit/daily-task-calendar.test.mjs tests/unit/daily-tasks-navigation.test.mjs tests/unit/daily-task-planning.test.mjs tests/unit/recurrence.test.mjs` from `apps/web`.
- [ ] Execute `npm run format:check`, `npm run lint`, and `npm run build` from `apps/web`.
- [ ] Follow quickstart's task creation, view consistency, calendar rollback, filter, recurrence-idempotence, preset, Planner, keyboard, and 320px matrix.
- [ ] Review `git diff` and preserve all unrelated original changes. Commit validation/doc updates as `test: cover daily planning workflow`.

## Complexity Tracking

No constitution violations require justification.
