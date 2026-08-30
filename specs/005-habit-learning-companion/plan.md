# Implementation Plan: Habit and Learning Companion

**Branch**: `005-habit-learning-companion` | **Date**: 2026-08-30 | **Spec**: [spec.md](spec.md)

## Summary

Refocus JanGo around daily habits and personal learning. Preserve existing Supabase-backed learning data, remove Kanban from the everyday product experience, create a shared server-side dashboard read model, and rebuild the shell and primary surfaces with a soft vintage-blue, warm-paper design system.

## Technical Context

**Language/Version**: TypeScript 5, Next.js 14 App Router, React 18

**Primary Dependencies**: Tailwind CSS 3, Supabase SSR/JS, Lucide, Recharts, Zod

**Storage**: Supabase Postgres with RLS and sequential SQL migrations

**Testing**: Existing lint/build only. Add test tooling separately after the product flow is stable.

**Target Platform**: Desktop-first responsive web application

**Project Type**: Monorepo with web frontend and Supabase migrations

**Performance Goals**: Render dashboard's actionable sections from small, bounded server-side datasets; no full history transfer for a current dashboard summary.

**Constraints**: Preserve authentication, RLS, existing user data, existing learning routes, and appearance preference persistence. Do not introduce unsupported file upload/storage.

**Scale/Scope**: One personal user, six primary destinations, four learning categories.

## Constitution Check

The project constitution is still a placeholder. The repository's actual governing rules are `AGENTS.md`, `.claude/rules/`, and `apps/web/DESIGN.md`. This plan follows their feature-folder, server-component, RLS, and Vietnamese-copy requirements. No additional architectural layer is introduced.

## Product Decisions

| Area | Decision | Rationale |
|---|---|---|
| Boards | Remove from primary navigation, preserve routes/data | Eliminates task-management framing without destructive data loss |
| Notes | Keep as a secondary personal reference surface | Notes can support learning; remove task-specific wording and links incrementally |
| Learn | Keep existing category experiences and SRS routes | They hold real user data and working learning logic |
| Library | Provide a curated read model over existing sets/material sources | Delivers browse/continue value before building arbitrary uploads |
| Dashboard | New shared aggregate service + composition page | Prevent duplicate calculation and full-history client work |
| Dark mode | Preserve existing preference system, optimize light first | Matches the product brief without discarding working persistence |

## Data and Domain Design

### Habit domain

`features/habits/lib/summary.ts` becomes the pure source for local-date-aware completion grouping, daily state, streaks, longest streak, and weekly rate. Page/server code only fetches a bounded window then delegates calculations.

### Learning domain

`features/learning/lib/summary.ts` becomes the dashboard/library read model. It combines existing records without replacing their storage:

- Vocabulary uses user SRS progress and user-owned vocabulary sets.
- Grammar uses user grammar status and user-owned grammar sets.
- Reading uses reading-passage sets, question progress, and reading logs.
- Listening uses listening logs as the current material/activity source.

The first Library deliberately represents existing structured content. A future upload capability can add `materials`, `lessons`, and item tables once actual file formats and ingestion requirements are defined.

### Dashboard read model

`features/dashboard/lib/home.ts` fetches independent source data in parallel. It requests:

- active habits plus a limited completion window
- due review queue summary
- 7-day learning activity
- category counts from existing progress tables
- recent material/set metadata

It returns a presentation-neutral object for both page and API consumers. It must not request 371 days or all activity history solely for a home dashboard.

## Design Direction

- Light theme: dusty vintage blue `#6F8FAF`, warm paper `#F5F3EE`, card `#FBFAF7`, charcoal `#30383F`.
- Categories: muted sage grammar, dusty blue vocabulary, muted lavender listening, muted ochre reading.
- Typography: retain Plus Jakarta Sans and Noto Sans JP for continuity. A restrained display serif may be added only after asset and loading review; the first implementation uses the existing font stack.
- Shape system: 14px controls, 18px surfaces, rounded-full only for compact status chips.
- Motion: 150-200ms feedback on habit completion and controls, all with reduced-motion fallback. No decorative motion, confetti, or layout-shifting hover effects.
- Use CSS variables and existing Tailwind token wiring. Do not introduce a competing theme system.

## Project Structure

```text
apps/web/
├── app/(app)/
│   ├── page.tsx                       # dashboard
│   ├── habits/page.tsx
│   ├── learn/                         # category/study routes retained
│   ├── library/page.tsx               # library read-model surface
│   ├── progress/page.tsx              # focused progress surface
│   └── settings/page.tsx
├── features/
│   ├── dashboard/{components,lib}
│   ├── habits/{components,lib,types}
│   ├── learning/{components,lib,types}
│   ├── library/{components,lib,types}
│   └── progress/{components,lib}
├── shared/components/                 # app shell and reusable primitives
└── app/globals.css                    # semantic tokens and primitives

apps/supabase/migrations/
└── 0033_*                             # only if a later read model needs persisted schema
```

**Structure Decision**: Reuse the repository's existing feature-folder model. New domain helpers are pure functions under their feature; server pages compose them and client components own only interaction state.

## Delivery Order

1. Establish tokens and simplified navigation.
2. Build bounded habit and learning summary helpers.
3. Rebuild Dashboard and Habits around immediate actions.
4. Add Library and Progress using existing data.
5. Consolidate existing learn pages under a calmer category entry point.
6. Deprioritize/clean task-management UI only after replacements are verified.
