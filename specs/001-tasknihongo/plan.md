# Implementation Plan: TaskNihongo — Task Management + JLPT N2 Japanese Learning

**Branch**: `001-tasknihongo` | **Date**: 2026-08-15 (updated) | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-tasknihongo/spec.md`

## Summary

TaskNihongo is a responsive web app combining a Trello/Linear-style Kanban board, an N2-focused Japanese study system (grammar-point tracker with confusable-pair comparisons, blended vocab/kanji SRS, reading/listening practice logs, mock-test tracking with exam countdown, a mistake notebook feeding SRS, and a streak/heatmap study plan), and freeform markdown notes, behind role-gated (`user`/`admin`) authentication. Technical approach: Next.js (App Router, TypeScript) frontend on Vercel, Supabase (Postgres + Auth + Storage) as the backend-as-a-service with Row Level Security enforcing per-user data isolation and a server-verified `admin` role for the moderation dashboard. Kanban drag-and-drop uses dnd-kit with optimistic client-side state; SRS scheduling for both vocab/kanji and grammar reviews is a simplified SM-2 variant computed server-side on review submission.

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 20 LTS

**Primary Dependencies**: Next.js 14+ (App Router), React 18, Tailwind CSS, dnd-kit (drag-and-drop), @supabase/supabase-js + @supabase/ssr (server-side session handling), react-markdown or equivalent (note rendering with sanitization), a lightweight charting library (e.g. Recharts or visx) for the mock-test trend chart and study-time chart, a heatmap component (custom or `react-calendar-heatmap`-style) for the streak contribution graph

**Storage**: Supabase-managed Postgres (relational data across boards/tasks, grammar/vocab/kanji reference + per-user status, reading/listening logs, mock test results, mistake notebook, review logs, notes); Supabase Storage (task/note attachments, binary objects)

**Testing**: Vitest or Jest for unit tests (notably `sm2.ts` and weak-item/heatmap aggregation logic); Playwright for end-to-end flows (Kanban drag-and-drop, grammar status change + confusable-pair view, blended SRS review session, mistake→SRS one-click add, admin role-gate); contract tests against Supabase RLS policies using a test project/schema

**Target Platform**: Web (modern evergreen browsers), responsive desktop + mobile viewports; deployed serverless on Vercel

**Project Type**: Web application (single Next.js app serving both UI and API routes; Supabase as external managed backend — no separate backend service to build)

**Performance Goals**: Optimistic UI updates for Kanban drag-and-drop rendering within 200ms (SC-003); grammar/confusable-pair lookup findable within 15s (SC-009); dashboard/admin queries returning within ~1s for the expected v1 scale

**Constraints**: Auth required on all user routes; admin routes MUST verify role server-side (never trust a client-side flag or JWT claim inspected only in the browser) per FR-003; RLS policies MUST enforce per-user isolation as the source of truth for data access, not just app-layer checks, per FR-004/SC-007 — this now spans grammar-status/personal-notes and all log tables in addition to the original task/note/vocab tables; UI MUST be usable on a 375px-wide viewport without horizontal scroll (SC-008)

**Scale/Scope**: Early-stage single-tenant-per-user app; design for low hundreds of users. Reference-content scale is now non-trivial: ~200 grammar points, ~6,000 N2 vocab words, ~1,000 kanji as shared/global rows, plus per-user status/SRS-state rows fanning out per user per reference item — schema and indexing must account for this fan-out (see data-model.md), not just low-thousands-per-user as in the original Kanban/notes-only scope.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` is still the unedited template (all principles are placeholders, no ratified version) — there are no project-specific principles to gate against yet. This plan proceeds without constitution constraints. Recommendation unchanged from the prior plan revision: run `/speckit-constitution` before or during implementation to ratify real principles (e.g., "RLS is the source of truth for authorization," "server-side role checks only," "SRS scheduling is always server-computed, never client-submitted") so future features are checked consistently. No violations to record in Complexity Tracking — the gate is currently a no-op, not a pass earned by compliance.

## Project Structure

### Documentation (this feature)

```text
specs/001-tasknihongo/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

Repository root splits into two top-level apps: `apps/web` (Next.js frontend) and `apps/supabase` (database schema/config), kept as plain sibling folders (no workspace tooling — a single app consumes Supabase today). Inside `apps/web`, routing lives under `app/` per Next.js App Router requirements, but route files stay thin and import their UI/logic from `features/<module>/` — one folder per user story, so each module's components and logic live in one place. Cross-module infrastructure (Supabase clients, SRS scheduler, shared validation) lives in `shared/`.

```text
apps/
├── web/                             # Next.js application
│   ├── app/                         # Next.js App Router root — routing only, thin pages
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   └── signup/page.tsx
│   │   ├── (app)/                   # authenticated user shell
│   │   │   ├── boards/
│   │   │   │   ├── page.tsx               # board list
│   │   │   │   └── [boardId]/page.tsx     # single Kanban board
│   │   │   ├── learn/
│   │   │   │   ├── grammar/
│   │   │   │   │   ├── page.tsx           # N2 grammar list, status, level-diff filter
│   │   │   │   │   └── confusables/[pairId]/page.tsx  # side-by-side comparison view
│   │   │   │   ├── vocab/page.tsx         # vocab/kanji deck management (browse/add custom)
│   │   │   │   ├── review/page.tsx        # blended SRS review queue (vocab+kanji+grammar, weak-only mode)
│   │   │   │   ├── reading/page.tsx       # reading log entry + history + by-type breakdown
│   │   │   │   ├── listening/page.tsx     # listening log entry + history
│   │   │   │   ├── mock-tests/page.tsx    # score entry + trend chart + exam countdown
│   │   │   │   ├── mistakes/page.tsx      # mistake notebook
│   │   │   │   └── dashboard/page.tsx     # consolidated progress dashboard + streak heatmap
│   │   │   └── notes/
│   │   │       ├── page.tsx               # notes list/search
│   │   │       └── [noteId]/page.tsx
│   │   ├── admin/                   # role-gated admin route group
│   │   │   ├── layout.tsx                 # server-side role check
│   │   │   ├── users/page.tsx
│   │   │   ├── content/page.tsx
│   │   │   ├── stats/page.tsx
│   │   │   └── reference-data/            # global vocab / kanji / grammar / confusable-pair management
│   │   │       └── page.tsx
│   │   ├── api/                     # Next.js route handlers (server-side only actions)
│   │   │   ├── reviews/route.ts           # SRS review submission (vocab/kanji/grammar; computes next interval)
│   │   │   ├── mistakes/[id]/add-to-srs/route.ts  # one-click mistake → SRS scheduling
│   │   │   └── admin/**/route.ts          # admin mutations using service-role client
│   │   └── middleware.ts            # session refresh + admin route guard
│   │
│   ├── features/                    # one folder per user story — components + module-local logic
│   │   ├── kanban/components/             # US1: board, column, task card, dnd-kit wiring
│   │   ├── grammar/components/            # US2: grammar list row, status control, confusable-pair card
│   │   ├── vocab-srs/components/          # US3: vocab/kanji forms, unified review card
│   │   ├── reading-listening/components/  # US4: log form + history table, attach-to-SRS action
│   │   ├── mock-tests/components/         # US5: score form, trend chart, exam date + countdown widget
│   │   ├── mistakes/components/           # US6: mistake notebook table + add-to-SRS button
│   │   ├── study-plan/{components,lib}/   # US7: goal settings, streak heatmap, study-time chart, heatmap.ts
│   │   ├── dashboard/lib/                 # US8: weak-area aggregation (weak-areas.ts)
│   │   ├── notes/components/              # US9: markdown editor/renderer, folder/tag picker
│   │   └── admin/components/              # US10: user table, content moderation, stats cards, reference-data editor
│   │
│   ├── shared/                      # cross-module infrastructure
│   │   ├── supabase/
│   │   │   ├── client.ts                  # browser client
│   │   │   ├── server.ts                  # server component / route handler client
│   │   │   └── admin.ts                   # service-role client (server-only, admin routes)
│   │   ├── srs/
│   │   │   └── sm2.ts                     # spaced-repetition scheduling logic, shared by vocab/kanji and grammar reviews
│   │   └── validation/                    # shared zod schemas for forms + API routes
│   │
│   └── tests/
│       ├── unit/                    # sm2.ts, heatmap.ts, validation schemas, pure helpers
│       ├── integration/             # Supabase RLS policy tests (per-table isolation, incl. grammar-status/logs)
│       └── e2e/                     # Playwright: kanban dnd, grammar+confusables flow, blended review, mistake→SRS, admin gate
│
└── supabase/                        # Supabase project (schema/config only, no app code)
    ├── config.toml
    ├── migrations/                  # SQL migrations: schema + RLS policies
    └── seed.sql                     # global N2 grammar points, confusable pairs, N2 vocab/kanji seed data
```

**Structure Decision**: Single Next.js application (Supabase as an external managed backend rather than a custom backend service to build), split into `apps/web` and `apps/supabase` as plain sibling folders — no workspace tooling, since only one app consumes Supabase today. Within `apps/web`, `app/` route groups separate the public/auth area, the authenticated user app shell — now with a substantially larger `learn/` subtree covering grammar, vocab/kanji, review, reading/listening logs, mock tests, mistakes, and dashboard — and the role-gated `/admin` area (now also managing reference data for grammar/confusables in addition to vocab); each route composes UI from its matching `features/<module>/` folder so a module's code stays in one place.

## Complexity Tracking

*No constitution violations to justify — see Constitution Check above (gate is currently a no-op pending `/speckit-constitution`).*
