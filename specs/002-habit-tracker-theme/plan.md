# Implementation Plan: Habit Tracker & Theme System

**Branch**: `002-habit-tracker-theme` | **Date**: 2026-08-16 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-habit-tracker-theme/spec.md`

## Summary

Adds two independent capabilities to TaskNihongo: (1) a personal habit tracker — create/delete habits, tick a checkbox per habit per day on a month-view grid, with a simple per-habit streak indicator — separate from the existing SRS study-plan heatmap; (2) an account-level appearance system — explicit light/dark mode (defaulting to light, not OS-driven) plus one of 4 admin-manageable color themes stored in a Supabase reference table, applied with no flash-of-wrong-theme via a server-read cookie primed by `middleware.ts` and written alongside the DB row on every change. Technical approach: two new owner-scoped tables (`habits`, `habit_completions`) following the existing direct-client-to-Supabase-under-RLS pattern; two new tables for theming (`themes` as global reference data, `user_appearance_preferences` as a one-row-per-user table) plus one new route handler (`POST /api/appearance`) and one new admin reference-data CRUD route (`/api/admin/reference-data/themes`), both following patterns already established in 001-tasknihongo.

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 20 LTS (unchanged from 001-tasknihongo)

**Primary Dependencies**: No new npm dependencies — reuses the existing Next.js 14 App Router, Tailwind CSS (switching `darkMode` from `'media'` to `'class'`), @supabase/supabase-js + @supabase/ssr, zod. No theming library added (research.md §1).

**Storage**: Supabase-managed Postgres — 4 new tables (`habits`, `habit_completions`, `themes`, `user_appearance_preferences`); one new cookie (`theme`, non-httpOnly, holding `{mode, themeSlug}`) for SSR flash avoidance (research.md §3).

**Testing**: Same as 001-tasknihongo — Vitest/Jest for pure helpers (the habit streak calculator, mirroring `study-plan/lib/heatmap.ts`'s pattern), Playwright for the three end-to-end flows in quickstart.md, RLS contract tests for the 4 new tables.

**Target Platform**: Web, same deployment target (Vercel + Supabase) as 001-tasknihongo — no new infrastructure.

**Project Type**: Web application — extends the existing single Next.js app; no new services.

**Performance Goals**: Habit tick/untick reflected in the UI within 200ms (optimistic update, same pattern as Kanban's optimistic task-move); appearance change applies with no visible flash on the *next* load (SC-005) and within one page load cross-device (SC-004).

**Constraints**: Theme catalog MUST be admin-manageable via the existing admin service-role pattern, not hardcoded (FR-012, FR-015); appearance MUST default to light without depending on OS `prefers-color-scheme` (FR-009); habit data MUST stay RLS-isolated per user like every other owner-scoped table in this project (FR-001–FR-008 imply standard per-user isolation, consistent with data-model.md's RLS Summary pattern).

**Scale/Scope**: Same low-hundreds-of-users scale as 001-tasknihongo. Habit data fan-out is small (a handful of habits per user, ~30 completion rows per habit per month) — no special indexing concerns beyond the existing owner-scoped-table conventions.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` is still the unedited template (no ratified principles), same as when 001-tasknihongo was planned — there are no project-specific principles to gate against. This plan proceeds without constitution constraints; no violations to record in Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/002-habit-tracker-theme/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

Extends the existing `apps/web` structure from 001-tasknihongo — same `app/` (routing only) + `features/<module>/` (components + module-local logic) + `shared/` (cross-module infrastructure) split. No new top-level directories.

```text
apps/
├── web/
│   ├── app/
│   │   ├── (app)/
│   │   │   ├── habits/page.tsx              # habit grid page (US1)
│   │   │   └── settings/page.tsx            # appearance settings page (US2)
│   │   ├── admin/
│   │   │   └── reference-data/page.tsx      # existing page — add a themes section/tab (US3)
│   │   ├── api/
│   │   │   ├── appearance/route.ts          # POST — writes DB row + cookie (US2)
│   │   │   └── admin/reference-data/themes/route.ts  # admin CRUD (US3)
│   │   ├── layout.tsx                       # MODIFIED — reads `theme` cookie, sets <html class/data-theme>
│   │   └── middleware.ts                    # MODIFIED — primes the `theme` cookie when absent on an authed request
│   │
│   ├── features/
│   │   ├── habits/
│   │   │   ├── components/                  # HabitGrid, HabitRow, AddHabitForm, MonthNav
│   │   │   └── lib/streak.ts                # pure streak/count calculator (research.md §5)
│   │   └── appearance/
│   │       └── components/                  # ThemePicker, ModeToggle, admin ThemeForm/ThemeTable
│   │
│   ├── shared/
│   │   └── validation/schemas.ts            # MODIFIED — add habit + appearance zod schemas
│   │
│   └── tests/
│       ├── unit/                            # streak.ts
│       ├── integration/                     # RLS tests for the 4 new tables
│       └── e2e/                             # habit CRUD + tick flow, theme switch + persistence, admin theme CRUD
│
└── supabase/
    └── migrations/                          # new migrations: habits, habit_completions, themes (+RLS), user_appearance_preferences (+RLS), theme seed
```

**Structure Decision**: No structural change to the existing `apps/web`/`apps/supabase` split — two new `features/` modules (`habits`, `appearance`) alongside the ten existing ones, two new route groups under `app/(app)/`, one new API route plus one addition to the existing admin reference-data route family, and targeted edits to `app/layout.tsx` + `middleware.ts` for the cookie-based no-flash mechanism (research.md §3).

## Complexity Tracking

*No constitution violations to justify — see Constitution Check above (gate remains a no-op pending `/speckit-constitution`).*
