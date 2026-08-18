# JanGo (a.k.a. TaskNihongo)

A personal productivity app combining a JLPT N2 Japanese study tracker (vocab/grammar SRS,
reading & listening logs, mock tests, mistake notebook) with a Kanban board, notes, and a habit
tracker. One product, one user-facing shell (`AppNav`) — every surface should read as part of
the same app, not a bundle of side projects bolted together.

## Monorepo layout

- `apps/web` — Next.js 14 (App Router) + TypeScript frontend. Nearly all product code lives here.
- `apps/supabase` — Supabase config (`config.toml`) + SQL migrations
  (`migrations/NNNN_description.sql`, zero-padded, sequential, one concern per file).
- `specs/NNN-feature-slug/` — spec-kit feature specs (`spec.md` → `plan.md` → `tasks.md`) for
  past and in-progress features, produced by the `speckit-*` skills.
- `.specify/` — spec-kit tooling/templates behind those skills; not app code.

## Rules

@.claude/rules/tech-stack.md
@.claude/rules/coding-style.md
@.claude/rules/design-system.md
@.claude/rules/workflow.md

## Commands (run from `apps/web`)

- `npm run dev` — start the dev server
- `npm run build` / `npm run start` — production build / serve
- `npm run lint` — ESLint (`next lint`)
- `npm run format` / `npm run format:check` — Prettier (`prettier-plugin-tailwindcss` included,
  so class order is auto-sorted — don't hand-order Tailwind classes against it)

## Where things live

- `apps/web/app/**` — routes only: thin Server Components doing auth guard + data fetch +
  compose. Every top-level route folder under `app/` has its own small `CLAUDE.md` pointing back
  here with notes local to that route — check it when working inside one.
- `apps/web/features/<name>/{components,lib}` — the actual feature logic and UI, one folder per
  domain: `grammar`, `vocab-srs`, `reading-listening`, `study-plan`, `mistakes`, `mock-tests`,
  `dashboard`, `habits`, `kanban`, `notes`, `appearance`, `admin`.
- `apps/web/shared/` — cross-feature code: Supabase clients (`shared/supabase`), the SRS
  algorithm (`shared/srs`), shared UI (`shared/components`), hooks, validation.
- `apps/web/DESIGN.md` — the binding UI design system reference (colors, type scale, component
  primitives, motion rules) — read it before non-trivial UI work; see
  `.claude/rules/design-system.md` for the short version.
