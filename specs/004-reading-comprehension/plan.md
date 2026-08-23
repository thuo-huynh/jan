# Implementation Plan: Reading Comprehension Passage Bank

**Branch**: `004-reading-comprehension` | **Date**: 2026-08-23 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-reading-comprehension/spec.md`

## Summary

Add a second tab to the existing Reading page (`/learn/reading`) — a passage bank alongside the
existing practice-session log — in four independently-shippable slices: (P1) bulk HTML import of
a personal study document's `.dokkai-item` blocks into passages + questions, auto-grouped into a
set named after the source tab, mirroring Grammar's HTML importer; (P2) a click-to-answer quiz
reader with instant grading, explanation reveal, and retry; (P3) a manual passage-creation form as
an alternative to import; (P4) tap/hover vocabulary annotations with a one-action "add to SRS"
button. A wrong first answer automatically writes a Mistake Notebook entry. No new dependencies,
no new Route Handlers — everything is Supabase reads/writes plus pure TypeScript parsing/mapping
functions, matching the codebase's established Grammar-import architecture.

## Technical Context

**Language/Version**: TypeScript, Next.js 14 (App Router), React 18 — matches the rest of `apps/web`.

**Primary Dependencies**: `@supabase/ssr` (existing), Zod (existing), `lucide-react` (existing).
`DOMParser` (browser built-in, already used by `parseGrammarHtml.ts`). No new packages.

**Storage**: Supabase/Postgres. Three new tables (`reading_passage_sets`, `reading_passages`,
`reading_passage_questions`), one new nullable FK column on `vocab_entries`, one widened check
constraint on `mistake_notebook.source` (see data-model.md).

**Testing**: No test runner is wired up in this repo (`apps/web/tests/*` are empty scaffolding —
see root `CLAUDE.md`); the two new parsers (`parseReadingHtml.ts`, `parseInlinePassageSyntax.ts`)
and the quiz-grading helper are written as pure, I/O-free functions so a future runner can cover
them directly, same posture as `parseGrammarHtml.ts` and `features/study-plan/lib/*` today.

**Target Platform**: Web (Next.js app, existing deployment target — unchanged).

**Project Type**: Web application (existing monorepo, `apps/web` + `apps/supabase`) — not a new
project type.

**Performance Goals**: No new performance requirement beyond "adds negligible latency to an
already-per-request Server Component render" — the passage-bank tab's initial data (passages +
questions + sets) is fetched once server-side alongside the existing `reading_logs` query already
on that page; the HTML parser runs client-side, synchronously, on a single pasted document (same
cost profile as `parseGrammarHtml.ts`, which handles documents of the same size today).

**Constraints**: Solo-user app (Supabase RLS is the trust boundary); passages are always
user-owned (no admin-curated global catalog, per spec.md's Assumptions); no passage/question
editing after creation (delete + recreate only, per spec.md); passage content is never rendered
via `dangerouslySetInnerHTML` — stored and rendered as structured segments, consistent with
`GrammarMarkdown.tsx`'s sanitize-only-trusted-input posture.

**Scale/Scope**: 4 user stories, 2 migrations (3 new tables + RLS) + 2 small link/constraint
migrations, 1 new shared segment type, 2 new pure parser functions, ~8 new/touched components, 0
new routes.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` is still the unfilled template (placeholder principles, never
ratified for this project) — there are no project-specific gates to evaluate against. Falling
back to the binding project conventions in root `CLAUDE.md` and `.claude/rules/*.md` instead:

- **Feature-folder pattern** (tech-stack.md): routes stay thin, logic lives in
  `features/reading-listening/{components,lib}` (same domain folder the existing Reading page
  already uses — no new top-level feature folder needed). Only
  `app/(app)/learn/reading/page.tsx` (route/shell composition) touches `app/**` directly. ✅
- **Server Components by default** (coding-style.md): the page stays a Server Component fetching
  passages/questions/sets alongside the existing `reading_logs` query; only the tab switcher,
  import form, manual form, and quiz viewer need `'use client'` (they hold interactive state),
  same split as Grammar's `GrammarList`/`GrammarHtmlImportForm`. ✅
- **Pure logic lives in `lib/`, separate from components** (coding-style.md): `parseReadingHtml.ts`
  and `parseInlinePassageSyntax.ts` are pure, I/O-free, mirroring `parseGrammarHtml.ts`; a
  `gradeAnswer`-style pure helper backs the quiz viewer's grading logic instead of inlining it. ✅
- **Share data-fetching helpers instead of duplicating queries** (coding-style.md): one
  `mapReadingPassage.ts` row→prop mapper, reused wherever passages are rendered, mirroring
  `mapGrammarPoint.ts`. ✅
- **Migrations**: sequential, one concern per file — table creation, its RLS, the `vocab_entries`
  link column, and the `mistake_notebook` constraint widen are four separate migrations (see
  data-model.md), matching how `0013_vocab_reading_log_link.sql` shipped as its own file rather
  than folded into `0005_logs.sql`. ✅
- **No speculative abstraction / proportional scope** (coding-style.md): no generic "quiz engine"
  or "content type" abstraction — three concretely-named tables matching exactly what spec.md
  asks for; no editing UI (spec.md explicitly scopes editing out); no listening-passage reuse
  (spec.md explicitly scopes audio out). ✅

No violations; Complexity Tracking section below is empty.

## Project Structure

### Documentation (this feature)

```text
specs/004-reading-comprehension/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/api.md     # Phase 1 output (no new endpoints — documents why)
└── tasks.md             # Phase 2 output (/speckit-tasks — not created by this command)
```

### Source Code (repository root)

```text
apps/supabase/
└── migrations/
    ├── 0027_reading_passages.sql              # new: reading_passage_sets, reading_passages, reading_passage_questions
    ├── 0028_rls_reading_passages.sql          # new: RLS for the three tables above
    ├── 0029_reading_passage_vocab_link.sql    # new: vocab_entries.source_reading_passage_id
    └── 0030_mistake_notebook_reading_quiz.sql # new: widen mistake_notebook.source check constraint

apps/web/
├── app/(app)/learn/reading/
│   └── page.tsx                               # touched: fetch passages/questions/sets, render tab switcher
├── features/reading-listening/
│   ├── types.ts                               # touched: add PassageSegment/ReadingPassage/PassageQuestion/ReadingPassageSet
│   ├── lib/
│   │   ├── stats.ts                            # unchanged
│   │   ├── parseReadingHtml.ts                 # new: HTML import parser (mirrors parseGrammarHtml.ts)
│   │   ├── parseInlinePassageSyntax.ts         # new: manual-entry `term{reading|meaning}` parser
│   │   ├── mapReadingPassage.ts                # new: DB row -> camelCase mapping
│   │   └── gradeAnswer.ts                      # new: pure grading helper (chosen index -> correct/incorrect)
│   └── components/
│       ├── ReadingLogManager.tsx               # unchanged
│       ├── ListeningLogManager.tsx              # unchanged
│       ├── AttachToSrsButton.tsx                # unchanged (stays reading-log-specific)
│       ├── ReadingTabs.tsx                      # new: tab switcher (log vs passage bank)
│       ├── ReadingPassageBank.tsx               # new: set-grouped passage list, orchestrates the tab
│       ├── ReadingHtmlImportForm.tsx            # new: paste-HTML + preview + confirm (mirrors GrammarHtmlImportForm)
│       ├── ReadingPassageForm.tsx               # new: manual create form (mirrors GrammarPointForm)
│       ├── ReadingPassageSetSelect.tsx          # new: set picker/combobox (mirrors GrammarSetSelect)
│       ├── ReadingPassageViewer.tsx             # new: passage render + quiz interaction
│       └── AttachTermToSrsButton.tsx            # new: pre-filled attach-to-SRS for a passage vocab term
└── shared/validation/schemas.ts                 # touched: add readingPassageSchema, readingPassageQuestionSchema
```

**Structure Decision**: Existing `apps/web` feature-folder layout, extended in place inside
`features/reading-listening/` — no new top-level feature folder, since this is squarely within
the Reading page's existing domain and needs to share that page's tab shell. Follows the Grammar
feature's HTML-import + manual-form + set-select component split file-for-file rather than
inventing a new pattern.

## Complexity Tracking

*No Constitution Check violations — this section intentionally left empty.*
