# Tasks: Habit and Learning Companion

**Input**: Design documents from `specs/005-habit-learning-companion/`

## Phase 1: Foundation

- [X] T001 Update `apps/web/app/globals.css` and `apps/web/tailwind.config.ts` with semantic soft vintage-blue light tokens while preserving theme preference variables.
- [X] T002 Update `apps/web/shared/components/AppNav.tsx` and `apps/web/app/(app)/layout.tsx` for the six-destination product navigation.
- [X] T003 Create `apps/web/features/habits/lib/summary.ts` for bounded habit aggregates and pure local-date calculations.
- [X] T004 Create `apps/web/features/learning/lib/summary.ts` for category and library material read models.
- [X] T005 Create `apps/web/features/dashboard/lib/home.ts` to load independent home-summary data in parallel.

## Phase 2: User Story 1 - Complete today's habits (P1)

**Goal**: Make habit completion immediately actionable from home and Habits.

**Independent Test**: Toggle an active habit, reload, and confirm state and metrics are retained.

- [X] T006 [US1] Build `apps/web/features/habits/components/TodayHabitList.tsx` with optimistic completion feedback and rollback handling.
- [ ] T007 [US1] Rebuild `apps/web/app/(app)/habits/page.tsx` using the bounded habit summary and daily-first composition.
- [X] T008 [US1] Integrate today's habit list into `apps/web/app/(app)/page.tsx`.

## Phase 3: User Story 2 - Resume meaningful learning (P1)

**Goal**: Surface a clear next-learning action and browse existing material as a library.

**Independent Test**: A due review is reachable in one action and every library item links to a real learning surface.

- [ ] T009 [US2] Create `apps/web/features/dashboard/components/ContinueLearning.tsx` and category overview components.
- [X] T010 [US2] Create the first data-backed Library surface in `apps/web/app/(app)/library/page.tsx`.
- [ ] T011 [US2] Replace the current learning dashboard route with a redirect or compatibility alias to the new home experience.
- [X] T012 [US2] Add a concise category hub at `apps/web/app/(app)/learn/page.tsx` that keeps existing routes discoverable.

## Phase 4: User Story 3 - Understand progress at a glance (P2)

**Goal**: Display useful real consistency and weekly learning activity without an analytics wall.

**Independent Test**: Known dated records produce matching weekly activity and category metrics.

- [ ] T013 [US3] Create focused progress components in `apps/web/features/progress/components/`.
- [X] T014 [US3] Add `apps/web/app/(app)/progress/page.tsx` backed by the shared summary model.
- [X] T015 [US3] Replace dashboard raw-history heatmap/chart composition with bounded weekly activity and habit consistency sections.

## Phase 5: User Story 4 - Use a coherent personal space (P2)

**Goal**: Apply the same product language across primary pages and de-emphasize work management.

**Independent Test**: Navigate core pages at desktop/mobile widths without seeing Boards as a primary product area.

- [ ] T016 [US4] Update primary page copy, buttons, empty states, loading states, and surface primitives in `apps/web/app/globals.css` and affected feature components.
- [X] T017 [US4] Remove task-specific note linking from `apps/web/features/notes/` and note routes where safe.
- [X] T018 [US4] Keep Boards routes reachable only by direct legacy URL and remove their navigation affordances.

## Phase 6: Polish and validation

- [X] T019 Run lint and build validation from `apps/web`; address regressions. (`format:check` remains pending because the project npm executable is not on PATH.)
- [ ] T020 Validate responsive, keyboard, empty, error, and reduced-motion states using `specs/005-habit-learning-companion/quickstart.md`.
- [ ] T021 Update `README.md` with the JanGo product description and local setup.

## Dependencies and Execution Order

T001-T005 form the foundation. T006-T008 establish the primary habit experience. T009-T012 establish the learning continuation/library experience. T013-T015 then reuses shared summaries for Progress. T016-T021 are cross-cutting and proceed after the new primary paths are working.
