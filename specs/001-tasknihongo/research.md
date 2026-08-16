# Phase 0 Research: TaskNihongo

All items from the user-supplied tech stack are concrete choices, not open unknowns — this phase documents the rationale and the implementation-pattern decisions needed before design, including the decisions added for the N2-focused learning tracker expansion.

## 1. Auth & session handling

- **Decision**: Use `@supabase/ssr` with Next.js middleware to refresh the session cookie on every request, and read the user/role from the server-verified session in Server Components and Route Handlers — never from a client-readable cookie or localStorage flag.
- **Rationale**: Supabase's SSR helpers are the supported pattern for App Router; middleware-based refresh avoids stale-session edge cases. Reading role server-side satisfies FR-003 (admin gate must not be client-trusted).
- **Alternatives considered**: Client-only Supabase SDK with role stored in a client-visible JWT claim checked in the browser — rejected because a client-side-only check can be bypassed by directly calling API routes or Supabase from devtools.

## 2. Authorization model (RLS vs. app-layer checks)

- **Decision**: Postgres Row Level Security is the source of truth for data isolation (FR-004, SC-007). Every user-owned table (`boards`, `columns`, `tasks`, `task_checklist_items`, `vocab_entries` with non-null `user_id`, `grammar_points` with non-null `user_id`, `user_grammar_status`, `reading_logs`, `listening_logs`, `mock_test_results`, `mistake_notebook`, `notes`, `review_logs`, `study_goals`) gets `SELECT/INSERT/UPDATE/DELETE` policies scoped to `auth.uid() = user_id` (or ownership via a join for child tables). Admin bypass uses a separate service-role client, only ever instantiated in server-only code paths (`lib/supabase/admin.ts`, `app/api/admin/**`), never shipped to the browser.
- **Rationale**: RLS enforced at the database layer means even a bug in application code cannot leak cross-user data — defense in depth, and it's the standard Supabase pattern. This matters more now that the schema has grown to ~10 user-scoped tables instead of 4.
- **Alternatives considered**: App-layer-only authorization — rejected as the sole mechanism for the same reason as before, now with a larger blast radius if missed (personal grammar notes/mnemonics and mistake-notebook entries are sensitive-ish personal study data).

## 3. Spaced repetition scheduling (shared across vocab/kanji and grammar)

- **Decision**: Implement a simplified SM-2 algorithm as a pure function (`lib/srs/sm2.ts`) that takes the item's current `{interval, ease, repetitions, failCount}` and a graded response, and returns updated state plus next due date. Reused for both `vocab_entries` reviews and grammar-point reviews (grammar review is a lighter-weight "did I recall this correctly" grade feeding the same scheduler) so there's one scheduling algorithm, not two. Runs server-side in `app/api/reviews/route.ts` on submission — never client-computed.
- **Rationale**: FR-019/FR-020 (vocab/kanji) and the grammar mastery-status flow both need "did the user get this right, and when should they see it again" — sharing the algorithm avoids duplicated, potentially inconsistent SRS logic. `fail_count` is tracked explicitly (per the user-supplied `vocab_entries.fail_count` column) to directly power "weak items only" mode (FR-021) without recomputing it from `review_logs` on every query.
- **Alternatives considered**: Separate, simpler "status only" tracking for grammar (chưa học/đang ôn/đã thuộc) with no SRS scheduling at all — considered, since FR-013 only requires a 3-state status, not a due-date schedule. Decision: grammar points also participate in the *blended review queue* (FR-020's "review in both directions" and the unified queue implied by combining grammar + vocab review) get an SRS schedule too, but the 3-state status remains a separate, simpler field for the mastery-count dashboard stat (FR-037) — see data-model.md's `user_grammar_status` table. This keeps the coarse "mastered/total" UI concept independent from the finer-grained SRS due-date mechanics.

## 4. Kanban drag-and-drop

- **Decision**: dnd-kit for column/card drag-and-drop, with optimistic local state update on drop followed by a Supabase mutation (task's `column_id` and `position`); on mutation failure, roll back the optimistic state and surface an error toast.
- **Rationale**: dnd-kit is accessible (keyboard support), works well on touch, and is the library the user's stack description already named. Optimistic-first matches FR-011 and SC-003.
- **Alternatives considered**: react-beautiful-dnd — unmaintained, rejected. Native HTML5 drag-and-drop — rejected, poor touch/mobile support.

## 5. Markdown notes and personal grammar notes

- **Decision**: Store note body (and grammar personal-note body) as raw markdown text; render with `react-markdown` + `rehype-sanitize` to prevent stored-XSS via user content.
- **Rationale**: Markdown-as-source keeps content portable/searchable as plain text and avoids storing/trusting raw HTML. Same rationale extends naturally to the new personal grammar-note field (FR-014).
- **Alternatives considered**: Rich-text WYSIWYG storing HTML — rejected, adds XSS-sanitization surface.

## 6. Full-text search (notes)

- **Decision**: Postgres `tsvector`/`tsquery` (generated column + GIN index) over `notes.title || notes.body_markdown`, queried server-side scoped by RLS to the requesting user.
- **Rationale**: Built into Supabase's Postgres, no extra service, satisfies FR-041 without adding search infrastructure for v1 scale.
- **Alternatives considered**: Dedicated search service — rejected as overkill for v1 scale.

## 7. Reference-content fan-out (grammar/vocab/kanji at scale)

- **Decision**: Global reference rows (`vocab_entries` and `grammar_points` with `user_id IS NULL`) are seeded once (~7,000 vocab+kanji rows, ~200 grammar rows). Per-user state is **not** eagerly fan-out-inserted for every user against every reference row; instead, `user_grammar_status` and per-user vocab SRS state are created lazily (on first status change / first review) with a sensible implicit default (chưa học / not-yet-reviewed) for any reference row without an explicit per-user row yet. Dashboard "mastered/total" counts (FR-037) are computed as `COUNT(status='mastered') / (SELECT COUNT(*) FROM grammar_points WHERE user_id IS NULL)`, not by assuming a row exists per user per point.
- **Rationale**: Eagerly inserting ~7,200 per-user rows at signup is wasteful and unnecessary; lazy-row-on-first-touch is the standard pattern for this kind of "global catalog + per-user progress" shape and keeps writes proportional to actual study activity, which matters now that reference content is ~35x larger than the original vocab-only scope.
- **Alternatives considered**: Eager fan-out at signup (a la some SRS apps that pre-generate all cards) — rejected as unnecessary write amplification for v1 scale with no offsetting query-simplicity benefit (the "default to not-started" query pattern is simple enough).

## 8. Confusable-pair modeling

- **Decision**: `grammar_confusable_pairs` is a join table with `grammar_point_id_a`, `grammar_point_id_b` (both FK to `grammar_points`), and a `comparison_note`. It references only global (`user_id IS NULL`) grammar points, since confusable pairs are curated reference content, not per-user data (FR-015 explicitly frames this as a first-class shared feature, not a user annotation). Personal notes on either constituent point remain on that point's per-user note field, independent of the pair itself.
- **Rationale**: Matches the user-supplied schema (`grammar_confusable_pairs`) directly and keeps the comparison content centrally curatable/editable by admins (FR-048) rather than duplicated per user.
- **Alternatives considered**: Storing the comparison note as a third grammar_point-like entity — rejected, adds an unnecessary entity when a join table with a note column is sufficient.

## 9. Mistake notebook → SRS integration

- **Decision**: `mistake_notebook` rows optionally link to a `vocab_id` or `grammar_id`. The "add to SRS queue" action (FR-031) is a server-side route handler (`/api/mistakes/[id]/add-to-srs`) that, if the linked item already has SRS state, nudges its `srs_due_date` to today (or the next scheduling slot) rather than resetting the whole learning history; if the mistake has no link, the action is unavailable (Edge Case: manual entry with no link) and the UI should communicate that a link is required first.
- **Rationale**: "Nudge due date" preserves the item's existing ease/interval history (a mistake shouldn't fully erase prior correct reviews) while still guaranteeing it resurfaces soon, matching the spec's intent ("gets spaced-repetition follow-up instead of being forgotten") without conflating "made a mistake once" with "reset all progress."
- **Alternatives considered**: Full SRS reset on add-to-SRS (treat like an "again" grade) — rejected as too punitive for a single mistake note versus an actual failed review; kept as a distinct, gentler action.

## 10. Streak heatmap & daily goal

- **Decision**: `lib/study/heatmap.ts` aggregates `review_logs` (both vocab/kanji and grammar reviews) grouped by local calendar day per user, compared against the user's `study_goals` row (grammar-review-count target + vocab-review-count target) to compute a goal-met boolean per day; the heatmap component consumes a `{date, count, goalMet}[]` array for the trailing ~12 months, GitHub-contribution-graph style.
- **Rationale**: Reuses the same `review_logs` table already required for accuracy/streak stats (FR-036), avoiding a separate activity-tracking table; computing goal-met server-side keeps the heatmap consistent with the streak logic in one place.
- **Alternatives considered**: A separate `daily_activity` rollup table updated via triggers — considered for query performance at scale, but rejected for v1 given the stated scale/scope (low hundreds of users); revisit if dashboard query latency becomes an issue.

## 11. Mock test score trend chart

- **Decision**: `mock_test_results` rows are queried chronologically per user and rendered with a lightweight charting library (Recharts or visx) plotting per-section scores over `test_date`.
- **Rationale**: Straightforward time-series visualization; no need for a dedicated analytics/BI tool at this scale (FR-027).
- **Alternatives considered**: Server-rendered SVG chart with no client library — viable but a charting library reduces custom-rendering bugs for tooltip/axis behavior; not a significant enough decision to warrant hand-rolling.

## 12. Attachments

- **Decision**: Supabase Storage bucket namespaced by user id, Storage RLS policies mirroring table-level ownership; `tasks` stores only an `attachment_count` per FR-007/spec Assumptions.
- **Rationale**: Matches the spec's explicit assumption that attachments are represented by count in v1.
- **Alternatives considered**: Third-party file storage (S3 directly) — rejected, redundant given Supabase Storage is already part of the chosen stack.

All Technical Context items are resolved; no remaining `NEEDS CLARIFICATION` markers.
