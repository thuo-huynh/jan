---

description: "Task list for feature implementation"
---

# Tasks: Habit Tracker & Theme System

**Input**: Design documents from `/specs/002-habit-tracker-theme/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/api.md](./contracts/api.md), [quickstart.md](./quickstart.md)

**Tests**: Not explicitly requested in the spec (consistent with 001-tasknihongo). `quickstart.md`'s 3 scenarios serve as the manual/e2e acceptance pass in Polish.

**Organization**: Tasks are grouped by user story (spec.md priorities) so each story ships independently. US1 (habits) and US2/US3 (theming) touch fully disjoint tables/files — there is no cross-cutting Foundational work blocking both, only per-story schema work.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1, US2, or US3, matching spec.md

## Path Conventions

Extends the existing `apps/web/` (Next.js: `app/`, `features/<module>/`, `shared/`) + `apps/supabase/` (migrations) structure from 001-tasknihongo — no new top-level directories.

---

## Phase 1: Setup

**Purpose**: New feature-module scaffolding

- [x] T001 [P] Create base directories: `apps/web/features/habits/components/`, `apps/web/features/habits/lib/`, `apps/web/features/appearance/components/`

**Checkpoint**: Directories exist — user story implementation can begin.

---

## Phase 2: Foundational

**Purpose**: Cross-cutting blocking prerequisites for all user stories.

**None.** US1 (habits) and US2/US3 (theming) are fully independent — different tables, different routes, different UI surfaces — per plan.md's Structure Decision. Each story's own phase below includes its own migrations. Skip straight to Phase 3.

---

## Phase 3: User Story 1 - Track daily habits on a calendar grid (Priority: P1) 🎯 MVP

**Goal**: Users create/delete habits and tick a checkbox per habit per day on a month-view grid, with a simple per-habit streak indicator.

**Independent Test**: Create a habit, tick it done for today and a past day in the current month, un-tick a day, navigate to the previous month and back, delete the habit — works standalone with no theming/appearance work in place.

### Implementation for User Story 1

- [x] T002 [P] [US1] Create migration for `habits` and `habit_completions` tables in `apps/supabase/migrations/0015_habits.sql` (data-model.md "habits"/"habit_completions")
- [x] T003 [US1] Write RLS policies for `habits`/`habit_completions` (owner-scoped via `user_id`, matching data-model.md's RLS Summary) in `apps/supabase/migrations/0016_rls_habits.sql` (depends on T002)
- [x] T004 [P] [US1] Add `habitSchema` zod validation (name, length cap) to `apps/web/shared/validation/schemas.ts`
- [x] T005 [P] [US1] Implement pure per-habit streak/count calculator (walks completion dates backward from the viewed month's last relevant day) in `apps/web/features/habits/lib/streak.ts` (research.md §5)
- [x] T006 [US1] Habit grid page (Server Component: auth check, fetch the caller's habits + the viewed month's `habit_completions`) in `apps/web/app/(app)/habits/page.tsx` (depends on T002, T003)
- [x] T007 [US1] Add "Habits" nav link in `apps/web/app/(app)/layout.tsx` (depends on T006)
- [x] T008 [P] [US1] Habit row component (name, one cell per visible day, streak indicator from T005) in `apps/web/features/habits/components/HabitRow.tsx`
- [x] T009 [P] [US1] Day-cell checkbox component (tick/untick with optimistic update, rollback on failure) in `apps/web/features/habits/components/HabitDayCell.tsx`
- [x] T010 [US1] Habit grid manager (client: renders HabitRow list, owns month-in-view state, wires day-cell tick/untick mutations direct-to-Supabase under RLS) in `apps/web/features/habits/components/HabitGridManager.tsx` (depends on T008, T009)
- [x] T011 [P] [US1] Add-habit form/button (uses T004's schema) in `apps/web/features/habits/components/AddHabitForm.tsx`
- [x] T012 [US1] Delete-habit action (confirm dialog; cascades completions per FR-006) wired into `apps/web/features/habits/components/HabitRow.tsx` (depends on T008)
- [x] T013 [US1] Month navigation control (prev/next, updates HabitGridManager's month state) in `apps/web/features/habits/components/MonthNav.tsx`, wired into `apps/web/app/(app)/habits/page.tsx` (depends on T006, T010)

**Checkpoint**: Habit tracker fully functional and independently testable/demoable.

---

## Phase 4: User Story 2 - Customize light/dark mode and color theme (Priority: P2)

**Goal**: Users default to light mode, can switch to dark mode, and can pick one of 4 admin-seeded color themes from a settings page; the choice persists per account with no flash of the wrong theme.

**Independent Test**: Open settings as a fresh user (defaults to light), switch to dark, select each of the 4 seeded themes, reload to confirm persistence, then sign in from a different browser to confirm the preference follows the account — independent of the habit tracker and of User Story 3's admin CRUD (the 4 seed rows alone are enough).

### Implementation for User Story 2

- [x] T014 [P] [US2] Create migration for `themes` (global reference table) in `apps/supabase/migrations/0017_themes.sql`, and extend `apps/supabase/seed.sql` with the 4 default theme rows (data-model.md "themes", FR-018)
- [x] T015 [P] [US2] Create migration for `user_appearance_preferences` in `apps/supabase/migrations/0018_user_appearance_preferences.sql` (data-model.md "user_appearance_preferences")
- [x] T016 [US2] Write RLS policies: `themes` all-authenticated-SELECT/service-role-write (global reference, matching `vocab_entries`' shape), `user_appearance_preferences` owner-scoped, in `apps/supabase/migrations/0019_rls_appearance.sql` (depends on T014, T015)
- [x] T017 [P] [US2] Switch `darkMode` from `'media'` to `'class'` in `apps/web/tailwind.config.ts` (research.md §1)
- [x] T018 [P] [US2] Add `appearanceSchema` zod validation (mode enum, themeId uuid, both optional) to `apps/web/shared/validation/schemas.ts`
- [x] T019 [US2] `POST /api/appearance` route handler — upserts `user_appearance_preferences` and sets the `theme` cookie (`{mode, themeSlug}`) in the same response (contracts/api.md) in `apps/web/app/api/appearance/route.ts` (depends on T016, T018)
- [x] T020 [US2] Prime the `theme` cookie in `apps/web/middleware.ts` when absent on an authenticated request (read `user_appearance_preferences` + `themes`, fall back to light + lowest-`sort_order` theme per FR-016) (depends on T016)
- [x] T021 [US2] Read the `theme` cookie and render `<html class={mode==='dark'?'dark':''} data-theme={themeSlug}>` in `apps/web/app/layout.tsx` (depends on T017, T020)
- [x] T022 [US2] Server-render the selected theme's CSS variable overrides as an inline `<style>` in `apps/web/app/layout.tsx` — looks up the `themes` row by the cookie's `themeSlug` for `primary/secondary/accent(-foreground)` light+dark hex values; falls back to the default theme if the slug doesn't resolve (deleted theme, FR-017) (depends on T021)
- [x] T023 [US2] Settings page (Server Component: fetch the caller's `user_appearance_preferences` + all `themes` rows) in `apps/web/app/(app)/settings/page.tsx` (depends on T016)
- [x] T024 [US2] Add "Settings" nav link in `apps/web/app/(app)/layout.tsx` (depends on T023; sequence after T007 — both edit this file)
- [x] T025 [P] [US2] Mode toggle component (light/dark) in `apps/web/features/appearance/components/ModeToggle.tsx`
- [x] T026 [P] [US2] Theme picker component (swatch per theme, shows all rows from T023's fetch) in `apps/web/features/appearance/components/ThemePicker.tsx`
- [x] T027 [US2] Wire ModeToggle + ThemePicker to `POST /api/appearance` with optimistic UI update (apply the class/attribute change immediately, confirm/rollback on response) in `apps/web/app/(app)/settings/page.tsx` (depends on T019, T025, T026)

**Checkpoint**: Light/dark mode + theme picker fully functional and independently testable/demoable, using just the 4 seed themes (no admin UI needed yet).

---

## Phase 5: User Story 3 - Admin manages the available color themes (Priority: P3)

**Goal**: Admins can view/create/edit/delete color themes from the admin panel; changes are immediately reflected on the end-user settings page.

**Independent Test**: As an admin, create a new theme and confirm it appears as a selectable option on a regular user's Settings page (User Story 2); edit a theme's colors and confirm the change applies; delete a theme currently selected by a user and confirm that user falls back to the default theme.

### Implementation for User Story 3

- [x] T028 [P] [US3] `GET/POST/PUT/DELETE /api/admin/reference-data/themes` route handler (service-role client, admin-role-gated, matching the existing vocab/grammar/confusable-pairs reference-data routes) in `apps/web/app/api/admin/reference-data/themes/route.ts` (depends on T016)
- [x] T029 [US3] Themes section/tab on the admin reference-data page in `apps/web/app/admin/reference-data/page.tsx` (depends on T028)
- [x] T030 [P] [US3] Theme create/edit form (name, slug, sort order, 12 color fields) in `apps/web/features/appearance/components/ThemeAdminForm.tsx`
- [x] T031 [US3] Theme list/delete table (wired into T029's page) in `apps/web/features/appearance/components/ThemeAdminTable.tsx` (depends on T029, T030)

**Checkpoint**: All three user stories independently functional; theme catalog is now fully admin-manageable.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [x] T032 [P] Loading/empty states: zero habits (habit grid), and a settings page load failure (themes fetch error)
- [x] T033 [P] Responsive pass for the habit grid at a 375px viewport (day-cell columns scroll horizontally rather than overflowing/breaking layout)
- [ ] T034 Run `quickstart.md` validation scenarios 1–3 end-to-end and fix any discrepancies

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Empty — see note above.
- **User Stories (Phase 3–5)**: US1 has no dependency on US2/US3. US2 has no dependency on US1. US3 depends on US2's `themes` table existing (T014) but is otherwise independent of US2's UI/route work — an admin could theoretically build US3 in parallel with US2 once T014–T016 land, though priority order (P1 → P2 → P3) is the recommended path.
- **Polish (Phase 6)**: Depends on whichever stories are in scope for the current release being complete.

### Within Each User Story

- Migrations/RLS before any code that queries the new tables.
- Shared validation schemas before the forms/routes that use them.
- Components before the pages that compose them.
- US2's cookie-priming chain is strictly ordered: RLS (T016) → route handler (T019) / middleware (T020) → root layout read (T021) → root layout color render (T022) — each depends on the previous.

### Parallel Opportunities

- T001 (Setup) has nothing to wait on.
- Within US1: T002 migration, T004 schema, and T005 streak calculator are all [P] (different files, no interdependency); T008/T009 components are [P] before T010 composes them.
- Within US2: T014/T015 migrations are [P]; T017 tailwind config and T018 schema are [P]; T025/T026 components are [P] before T027 wires them.
- Within US3: T028 route and T030 form are [P] before T029/T031 compose them.
- US1 and US2 can be staffed and built fully in parallel (disjoint files, disjoint tables) once Phase 1 completes.

---

## Parallel Example: User Story 1

```bash
Task: "Create habits/habit_completions migration in apps/supabase/migrations/0015_habits.sql"
Task: "Add habitSchema to apps/web/shared/validation/schemas.ts"
Task: "Implement streak calculator in apps/web/features/habits/lib/streak.ts"
```

## Parallel Example: User Story 2

```bash
Task: "Create themes migration + seed in apps/supabase/migrations/0017_themes.sql"
Task: "Create user_appearance_preferences migration in apps/supabase/migrations/0018_user_appearance_preferences.sql"
Task: "Switch darkMode to 'class' in apps/web/tailwind.config.ts"
Task: "Add appearanceSchema to apps/web/shared/validation/schemas.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 3: User Story 1 (habit tracker)
3. **STOP and VALIDATE**: Run quickstart.md Scenario 1 independently
4. Deploy/demo if ready

### Incremental Delivery

1. Setup → Phase 3 (US1 habits) → validate → demo (MVP)
2. Phase 4 (US2 light/dark + themes) → validate → demo
3. Phase 5 (US3 admin theme CRUD) → validate → demo
4. Phase 6 Polish → production-ready

### Parallel Team Strategy

- Developer A: US1 (habits) — fully self-contained.
- Developer B: US2 (appearance core: migrations, cookie/middleware/layout plumbing, settings page) — build T014–T016 early since US3 depends on the `themes` table.
- Developer C: US3 (admin theme CRUD) — starts once T014–T016 land, otherwise independent of Developer B's route/UI work.

---

## Notes

- [P] tasks = different files, no dependencies.
- [Story] label maps task to specific user story for traceability.
- T016–T022 (US2's RLS → route/middleware → layout chain) is this feature's highest-leverage sequence — the no-flash guarantee (SC-005) and cross-device re-apply (SC-004) both depend on getting this ordering right.
- Commit after each task or logical group.
- Stop at any checkpoint to validate a story independently before continuing.
- Avoid: vague tasks, same-file conflicts, cross-story dependencies that break independence.
