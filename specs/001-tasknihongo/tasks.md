---

description: "Task list for feature implementation"
---

# Tasks: TaskNihongo — Task Management + JLPT N2 Japanese Learning

**Input**: Design documents from `/specs/001-tasknihongo/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/api.md](./contracts/api.md), [quickstart.md](./quickstart.md)

**Tests**: Not explicitly requested in the spec. No dedicated test-writing tasks are included; `quickstart.md` scenarios serve as the manual/e2e acceptance pass in the Polish phase. Add test tasks later if the team adopts TDD for this feature.

**Organization**: Tasks are grouped by user story (per spec.md priorities) to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US10, matching spec.md)

## Path Conventions

Two sibling apps per plan.md's Project Structure: `apps/web/` (Next.js: `app/` routes, `features/<module>/` components+logic, `shared/` cross-module infra, `tests/`) and `apps/supabase/` (migrations/config).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Initialize Next.js 14+ App Router project with TypeScript and Tailwind CSS inside `apps/web/`
- [x] T002 Install core dependencies inside `apps/web/`: `@supabase/supabase-js`, `@supabase/ssr`, `dnd-kit` (`@dnd-kit/core`, `@dnd-kit/sortable`), `react-markdown`, `rehype-sanitize`, `remark-gfm`, `recharts`, `zod`
- [x] T003 [P] Configure ESLint + Prettier for the project
- [x] T004 [P] Initialize Supabase project config at `apps/supabase/config.toml` for local dev (`supabase init`), run inside `apps/supabase/`
- [x] T005 [P] Create `.env.example` documenting `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- [x] T006 [P] Create base directory structure per plan.md: `apps/web/app/(auth)/`, `apps/web/app/(app)/`, `apps/web/app/admin/`, `apps/web/app/api/`, `apps/web/shared/supabase/`, `apps/web/shared/srs/`, `apps/web/shared/validation/`, `apps/web/features/kanban/components/`, `apps/web/features/grammar/components/`, `apps/web/features/vocab-srs/components/`, `apps/web/features/reading-listening/components/`, `apps/web/features/mock-tests/components/`, `apps/web/features/mistakes/components/`, `apps/web/features/study-plan/components/`, `apps/web/features/study-plan/lib/`, `apps/web/features/dashboard/lib/`, `apps/web/features/notes/components/`, `apps/web/features/admin/components/`, `apps/web/tests/unit/`, `apps/web/tests/integration/`, `apps/web/tests/e2e/`, `apps/supabase/migrations/`

**Checkpoint**: Project scaffold exists and installs/builds cleanly.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database schema, auth, and shared infrastructure that every user story depends on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

### Database schema & RLS

- [x] T007 Create migration for `profiles` table + trigger to sync from `auth.users` on signup in `apps/supabase/migrations/0001_profiles.sql`
- [x] T008 Create migration for `boards`, `columns`, `tasks`, `task_checklist_items` in `apps/supabase/migrations/0002_kanban.sql`
- [x] T009 Create migration for `vocab_entries` and `user_vocab_progress` in `apps/supabase/migrations/0003_vocab.sql`
- [x] T010 Create migration for `grammar_points`, `user_grammar_status`, `grammar_confusable_pairs` in `apps/supabase/migrations/0004_grammar.sql`
- [x] T011 Create migration for `reading_logs`, `listening_logs` in `apps/supabase/migrations/0005_logs.sql`
- [x] T012 Create migration for `mock_test_results` in `apps/supabase/migrations/0006_mock_tests.sql`
- [x] T013 Create migration for `mistake_notebook` in `apps/supabase/migrations/0007_mistakes.sql`
- [x] T014 Create migration for `notes` (incl. generated `search_vector` + GIN index) in `apps/supabase/migrations/0008_notes.sql`
- [x] T015 Create migration for `review_logs` (with `vocab_id`/`grammar_id` exactly-one-set check constraint) in `apps/supabase/migrations/0009_review_logs.sql`
- [x] T016 Create migration for `study_goals` in `apps/supabase/migrations/0010_study_goals.sql`
- [x] T017 Write RLS policies for all owner-scoped tables (`boards`, `columns`, `tasks`, `task_checklist_items`, `user_vocab_progress`, `user_grammar_status`, `reading_logs`, `listening_logs`, `mock_test_results`, `mistake_notebook`, `notes`, `review_logs`, `study_goals`, `profiles`) in `apps/supabase/migrations/0011_rls_owner_scoped.sql`, per data-model.md RLS Summary
- [x] T018 Write RLS policies for global/reference tables (`vocab_entries` and `grammar_points` where `user_id IS NULL` readable by all authenticated users, writable only by service-role; `grammar_confusable_pairs` readable by all, writable only by service-role) in `apps/supabase/migrations/0012_rls_reference_data.sql`

### Reference content seeding

- [x] T019 [P] Write `apps/supabase/seed.sql` seeding a representative sample of global `vocab_entries` (words + kanji, `is_kanji` flag set correctly) — full ~6,000/~1,000 content sourcing is a separate content task, seed enough for dev/test
- [x] T020 [P] Extend `apps/supabase/seed.sql` with ~200 global `grammar_points` rows and a handful of `grammar_confusable_pairs` (e.g. 〜として vs 〜にとって, 〜わけではない vs 〜わけがない) with comparison notes

### Auth & session

- [x] T021 Implement Supabase browser client in `apps/web/shared/supabase/client.ts`
- [x] T022 Implement Supabase server client (Server Components / Route Handlers) using `@supabase/ssr` in `apps/web/shared/supabase/server.ts`
- [x] T023 Implement Supabase service-role client (server-only) in `apps/web/shared/supabase/admin.ts`
- [x] T024 Implement `apps/web/middleware.ts`: refresh session on every request, redirect unauthenticated requests away from `(app)`/`admin` routes
- [x] T025 [P] Build sign-up page in `apps/web/app/(auth)/signup/page.tsx`
- [x] T026 [P] Build sign-in page in `apps/web/app/(auth)/login/page.tsx`
- [x] T027 Build authenticated app shell layout with nav (Boards / Learn / Notes) in `apps/web/app/(app)/layout.tsx`
- [x] T028 Build admin route group layout with server-side role check (redirect/403 if `profiles.role !== 'admin'`) in `apps/web/app/admin/layout.tsx`

### Shared logic

- [x] T029 [P] Implement shared SM-2-style scheduler (`computeNextReview(state, result)`) in `apps/web/shared/srs/sm2.ts`
- [x] T030 [P] Implement shared zod validation schemas (task, board/column, vocab entry, grammar status, note, log entry forms) in `apps/web/shared/validation/schemas.ts`

**Checkpoint**: Schema, RLS, auth, and shared scheduling/validation logic exist — user story implementation can now begin.

---

## Phase 3: User Story 1 - Manage tasks on a Kanban board (Priority: P1) 🎯 MVP

**Goal**: Users can create boards, add tasks with full metadata, drag-and-drop between columns, and filter/search.

**Independent Test**: Create a board, add a task with a checklist, drag it between columns, filter by tag — works standalone with no learning-tracker features.

### Implementation for User Story 1

- [ ] T031 [P] [US1] Board list page (create/list boards) in `apps/web/app/(app)/boards/page.tsx`
- [ ] T032 [P] [US1] Board detail page shell (loads columns/tasks) in `apps/web/app/(app)/boards/[boardId]/page.tsx`
- [ ] T033 [P] [US1] Column component (rename/add/remove/reorder) in `apps/web/features/kanban/components/Column.tsx`
- [ ] T034 [P] [US1] Task card component (title, tags, due date, progress, attachment count, assignee avatar) in `apps/web/features/kanban/components/TaskCard.tsx`
- [ ] T035 [US1] Task detail/edit modal (description, checklist editor) in `apps/web/features/kanban/components/TaskDetailModal.tsx`
- [ ] T036 [US1] Board drag-and-drop wiring with dnd-kit (column reorder + task move/reorder) in `apps/web/features/kanban/components/Board.tsx` (depends on T033, T034)
- [ ] T037 [US1] Optimistic task-move mutation with rollback-on-failure in `apps/web/features/kanban/components/Board.tsx` (depends on T036)
- [ ] T038 [US1] Checklist item CRUD + progress % derivation on task in `apps/web/features/kanban/components/ChecklistEditor.tsx` (depends on T035)
- [ ] T039 [US1] Task filter/search bar (by tag, due date, column/status) in `apps/web/features/kanban/components/BoardFilters.tsx`
- [ ] T040 [US1] Board default-column seeding on board creation (Todo/In Progress/In Review/Done) in `apps/web/app/(app)/boards/page.tsx` create handler (depends on T031)

**Checkpoint**: Kanban board is fully functional and independently testable/demoable.

---

## Phase 4: User Story 2 - Track N2 grammar point mastery and disambiguate confusables (Priority: P1)

**Goal**: Users browse the N2 grammar database, set per-point status, add personal notes, compare confusable pairs, and filter out N3-covered material.

**Independent Test**: Open the grammar list, change a point's status, add a personal note, open a confusable comparison, apply the N3-level-diff filter — independent of vocab/reading/listening.

### Implementation for User Story 2

- [ ] T041 [P] [US2] Grammar list page (pattern/meaning/connection form/nuance/example/frequency tag, status control) in `apps/web/app/(app)/learn/grammar/page.tsx`
- [ ] T042 [P] [US2] Grammar point row/status component in `apps/web/features/grammar/components/GrammarPointRow.tsx`
- [ ] T043 [US2] Status update handler (lazy-create `user_grammar_status` row on first change) wired into T042
- [ ] T044 [P] [US2] Personal note/mnemonic editor (markdown) attached to a grammar point in `apps/web/features/grammar/components/GrammarNoteEditor.tsx`
- [ ] T045 [US2] N3-level-diff filter toggle (hides `n3_overlap = true` points) in `apps/web/app/(app)/learn/grammar/page.tsx` (depends on T041)
- [ ] T046 [P] [US2] Confusable-pair comparison page in `apps/web/app/(app)/learn/grammar/confusables/[pairId]/page.tsx`
- [ ] T047 [US2] Confusable-pair side-by-side comparison component in `apps/web/features/grammar/components/ConfusablePairCard.tsx` (depends on T046)
- [ ] T048 [US2] Link confusable-pair entry points from the grammar list (badge/button per point that's part of a pair) in `apps/web/features/grammar/components/GrammarPointRow.tsx` (depends on T042, T047)

**Checkpoint**: Grammar tracker + confusables fully functional independently of Kanban and SRS review.

---

## Phase 5: User Story 3 - Review N2 vocabulary and kanji via spaced repetition (Priority: P1)

**Goal**: Users review a blended queue (preloaded + custom vocab/kanji) in both directions, with weak-items-only mode, and SRS state updates server-side.

**Independent Test**: Add a custom vocab word, confirm it's blended into the due queue, complete reviews in both directions, switch to weak-items-only mode — independent of grammar/reading/listening.

### Implementation for User Story 3

- [ ] T049 [US3] `GET /api/review-queue` route handler (blended vocab+kanji+grammar due items, `weakOnly` param) in `apps/web/app/api/review-queue/route.ts` (depends on T029)
- [ ] T050 [US3] `POST /api/reviews` route handler (resolves vocab vs. grammar, global vs. custom/owned state location, runs `sm2.ts`, writes `review_logs`) in `apps/web/app/api/reviews/route.ts` (depends on T029, T049)
- [ ] T051 [P] [US3] Vocab/kanji deck management page (browse preloaded, add/edit custom entries) in `apps/web/app/(app)/learn/vocab/page.tsx`
- [ ] T052 [P] [US3] Custom vocab entry form (word, reading, meaning, example, JLPT level, is_kanji) in `apps/web/features/vocab-srs/components/VocabEntryForm.tsx`
- [ ] T053 [US3] Review queue page (pulls from `/api/review-queue`) in `apps/web/app/(app)/learn/review/page.tsx` (depends on T049)
- [ ] T054 [US3] Review card component supporting reading→meaning and kanji recognition/writing-recall directions in `apps/web/features/vocab-srs/components/ReviewCard.tsx`
- [ ] T055 [US3] Review grading controls (again/hard/good/easy) submitting to `/api/reviews` in `apps/web/features/vocab-srs/components/ReviewCard.tsx` (depends on T050, T054)
- [ ] T056 [US3] "Review weak items only" toggle wired to `weakOnly` query param in `apps/web/app/(app)/learn/review/page.tsx` (depends on T053)

**Checkpoint**: Blended vocab/kanji SRS review fully functional independently of grammar tracker UI, reading/listening, and Kanban.

---

## Phase 6: User Story 4 - Log reading and listening practice (Priority: P2)

**Goal**: Users log reading/listening sessions, attach unknown items to SRS/notes, and see a by-passage-type comprehension breakdown.

**Independent Test**: Log a reading session with passage type and score, log a listening session, attach an unknown word to SRS, view the by-passage-type breakdown — independent of mock tests/mistake notebook.

### Implementation for User Story 4

- [ ] T057 [P] [US4] Reading log entry form + history table in `apps/web/app/(app)/learn/reading/page.tsx`
- [ ] T058 [P] [US4] Listening log entry form + history table in `apps/web/app/(app)/learn/listening/page.tsx`
- [ ] T059 [US4] "Attach unknown word to SRS/notes" action from a reading log entry (creates a custom `vocab_entries` row linked back to the log) in `apps/web/features/reading-listening/components/AttachToSrsButton.tsx` (depends on T057)
- [ ] T060 [US4] Reading comprehension by-passage-type breakdown component (feeds dashboard, but usable standalone on the reading page) in `apps/web/features/reading-listening/components/PassageTypeBreakdown.tsx` (depends on T057)

**Checkpoint**: Reading/listening logging functional independently of mock tests, mistakes, and dashboard.

---

## Phase 7: User Story 5 - Track mock test scores and exam countdown (Priority: P2)

**Goal**: Users record per-section mock test scores, see a trend chart, and set an exam date with a countdown widget.

**Independent Test**: Record two mock test results on different dates, confirm the trend chart reflects both; set an exam date, confirm the countdown shows the correct day count.

### Implementation for User Story 5

- [ ] T061 [US5] Mock test score entry form (section scores + total + date) in `apps/web/app/(app)/learn/mock-tests/page.tsx`
- [ ] T062 [US5] Score trend chart (per-section, chronological) using recharts in `apps/web/features/mock-tests/components/ScoreTrendChart.tsx` (depends on T061)
- [ ] T063 [P] [US5] Exam date setting control (stored on `profiles` or a small settings table — reuse `study_goals` row or add `exam_date` column via migration if needed) in `apps/web/features/mock-tests/components/ExamDateSetting.tsx`
- [ ] T064 [US5] "Days remaining" countdown widget in `apps/web/features/mock-tests/components/ExamCountdownWidget.tsx` (depends on T063)

**Checkpoint**: Mock test tracking + countdown functional independently of other learning features.

---

## Phase 8: User Story 6 - Maintain a mistake notebook that feeds spaced repetition (Priority: P2)

**Goal**: Users log mistakes (manual or from mock tests), link them to vocab/grammar, one-click add to SRS, and mark resolved.

**Independent Test**: Manually add a mistake linked to a vocab item, one-click add to SRS, mark resolved — independent of whether it originated from a mock test.

### Implementation for User Story 6

- [ ] T065 [US6] Mistake notebook page (list + manual-entry form, resolved/open filter) in `apps/web/app/(app)/learn/mistakes/page.tsx`
- [ ] T066 [US6] Mistake entry component with vocab/grammar link picker in `apps/web/features/mistakes/components/MistakeEntryForm.tsx`
- [ ] T067 [US6] `POST /api/mistakes/[id]/add-to-srs` route handler (nudge due date without full reset, 404 if unlinked) in `apps/web/app/api/mistakes/[id]/add-to-srs/route.ts` (depends on T029)
- [ ] T068 [US6] "Add to SRS queue" button wired to T067, disabled state when entry has no link in `apps/web/features/mistakes/components/MistakeRow.tsx` (depends on T067)
- [ ] T069 [US6] "Mark resolved" toggle (visually distinguishes, does not delete) in `apps/web/features/mistakes/components/MistakeRow.tsx`

**Checkpoint**: Mistake notebook + SRS integration functional independently of mock test data (manual entries work standalone).

---

## Phase 9: User Story 7 - Follow a daily study plan with streak tracking (Priority: P2)

**Goal**: Users set a daily goal, see a GitHub-style contribution heatmap, and a daily/weekly study-time chart.

**Independent Test**: Set a daily goal, meet it via grammar/vocab reviews, confirm the heatmap cell reflects goal-met state.

### Implementation for User Story 7

- [ ] T070 [US7] Daily goal settings form (grammar target + vocab target) writing to `study_goals` in `apps/web/features/study-plan/components/StudyGoalSettings.tsx`
- [ ] T071 [US7] Daily-activity aggregation from `review_logs` grouped by local day, goal-met calc in `apps/web/features/study-plan/lib/heatmap.ts` (depends on T029's shared conventions, T070)
- [ ] T072 [US7] Contribution heatmap component (GitHub-style, trailing ~12 months) in `apps/web/features/study-plan/components/StreakHeatmap.tsx` (depends on T071)
- [ ] T073 [US7] Daily/weekly study-time chart using recharts in `apps/web/features/study-plan/components/StudyTimeChart.tsx` (depends on T071)
- [ ] T074 [US7] Streak calculation (consecutive goal-met or ≥1-review days, resets on a skipped day) in `apps/web/features/study-plan/lib/heatmap.ts` (depends on T071)

**Checkpoint**: Study plan/streak functional independently, consuming existing `review_logs` from US2/US3 activity.

---

## Phase 10: User Story 8 - View consolidated progress dashboard (Priority: P2)

**Goal**: A single dashboard summarizing grammar mastery, vocab/kanji learned, accuracy, streak, and weak-area summary.

**Independent Test**: With seeded activity, confirm each dashboard figure matches underlying data.

### Implementation for User Story 8

- [ ] T075 [US8] `GET /api/dashboard` route handler aggregating grammar mastered/total, vocab/kanji learned, accuracy, streak, weak areas, exam countdown in `apps/web/app/api/dashboard/route.ts` (depends on T071, T074, T064)
- [ ] T076 [US8] Weak-area aggregation logic (lowest-scoring reading passage type + lowest-accuracy grammar/vocab category) in `apps/web/features/dashboard/lib/weak-areas.ts` (depends on T060)
- [ ] T077 [US8] Dashboard page composing mastery counters, heatmap, study-time chart, weak-area summary, exam countdown in `apps/web/app/(app)/learn/dashboard/page.tsx` (depends on T075, T072, T073, T064)

**Checkpoint**: Consolidated dashboard functional, correctly reflecting all upstream stories' data.

---

## Phase 11: User Story 9 - Capture and organize freeform notes (Priority: P3)

**Goal**: Users create markdown notes, organize by folder/tag, pin favorites, search, and optionally link to a task or vocab/grammar entry.

**Independent Test**: Create a note, assign folder/tags, pin it, link it to a task, find it via search — independent of Kanban/study state beyond the optional link target existing.

### Implementation for User Story 9

- [ ] T078 [P] [US9] Notes list/search page (folder/tag filters, pinned view) in `apps/web/app/(app)/notes/page.tsx`
- [ ] T079 [P] [US9] Note detail/editor page with markdown editing + sanitized rendering in `apps/web/app/(app)/notes/[noteId]/page.tsx`
- [ ] T080 [US9] Folder/tag picker component in `apps/web/features/notes/components/FolderTagPicker.tsx`
- [ ] T081 [US9] Pin toggle wired to `notes.pinned` in `apps/web/features/notes/components/NoteCard.tsx`
- [ ] T082 [US9] Full-text search bar querying `notes.search_vector` in `apps/web/app/(app)/notes/page.tsx` (depends on T078)
- [ ] T083 [US9] Task/vocab/grammar link picker for a note (writes `linked_task_id`/`linked_vocab_id`) in `apps/web/features/notes/components/NoteLinkPicker.tsx`
- [ ] T084 [US9] Linked-item display + graceful "no longer available" state on the note when a link target is deleted in `apps/web/app/(app)/notes/[noteId]/page.tsx` (depends on T079, T083)

**Checkpoint**: Freeform notes fully functional independently.

---

## Phase 12: User Story 10 - Admin moderates users and content (Priority: P3)

**Goal**: Admins search/suspend/delete users, moderate content, view usage stats, and manage global reference data.

**Independent Test**: Seeded admin account: search/find a user, view their content, suspend the account, edit a global grammar/vocab entry, confirm changes take effect.

### Implementation for User Story 10

- [ ] T085 [P] [US10] `GET /api/admin/users` route handler (search/list, service-role client) in `apps/web/app/api/admin/users/route.ts`
- [ ] T086 [US10] `POST /api/admin/users/[id]/suspend` route handler (status update + session invalidation) in `apps/web/app/api/admin/users/[id]/suspend/route.ts`
- [ ] T087 [US10] `DELETE /api/admin/users/[id]` route handler (confirm required, self/last-admin guard) in `apps/web/app/api/admin/users/[id]/route.ts`
- [ ] T088 [P] [US10] `GET /api/admin/content` and `DELETE /api/admin/content/[type]/[id]` route handlers (tasks/notes/vocab/grammar_notes/reading_logs/listening_logs/mistakes) in `apps/web/app/api/admin/content/route.ts` and `apps/web/app/api/admin/content/[type]/[id]/route.ts`
- [ ] T089 [P] [US10] `GET /api/admin/stats` route handler (total users, 7d/30d active, total tasks/notes/vocab) in `apps/web/app/api/admin/stats/route.ts`
- [ ] T090 [P] [US10] `GET/POST/PUT/DELETE /api/admin/reference-data/vocab` route handlers in `apps/web/app/api/admin/reference-data/vocab/route.ts`
- [ ] T091 [P] [US10] `GET/POST/PUT/DELETE /api/admin/reference-data/grammar` route handlers in `apps/web/app/api/admin/reference-data/grammar/route.ts`
- [ ] T092 [P] [US10] `GET/POST/PUT/DELETE /api/admin/reference-data/confusable-pairs` route handlers in `apps/web/app/api/admin/reference-data/confusable-pairs/route.ts`
- [ ] T093 [US10] Admin user list/search page + suspend/delete actions in `apps/web/app/admin/users/page.tsx` (depends on T085, T086, T087)
- [ ] T094 [US10] Admin content moderation page (search/inspect/remove) in `apps/web/app/admin/content/page.tsx` (depends on T088)
- [ ] T095 [US10] Admin usage stats page in `apps/web/app/admin/stats/page.tsx` (depends on T089)
- [ ] T096 [US10] Admin reference-data management page (vocab/grammar/confusable pairs CRUD UI) in `apps/web/app/admin/reference-data/page.tsx` (depends on T090, T091, T092)

**Checkpoint**: All user stories independently functional; admin moderation layer complete.

---

## Phase 13: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that span multiple user stories.

- [ ] T097 [P] Responsive/mobile pass across Kanban board, review queue, dashboard, and admin tables (375px viewport, no horizontal scroll — SC-008)
- [ ] T098 [P] Error handling + user-friendly toasts across mutation flows (task move rollback, review submission failure, admin action failure)
- [ ] T099 [P] Loading/empty states for each core surface (Edge Cases: zero boards/grammar-progress/vocab/notes, zero due reviews, zero weak items)
- [ ] T100 Security pass: verify every route handler enforces auth, admin routes enforce role server-side, and RLS policies match data-model.md RLS Summary exactly (FR-003, FR-004, SC-007)
- [ ] T101 Run `quickstart.md` validation scenarios 1–11 end-to-end and fix any discrepancies
- [ ] T102 [P] Deployment setup: connect GitHub repo to Vercel, configure environment variables, verify Supabase migrations run against the production project

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories.
- **User Stories (Phase 3–12)**: All depend on Foundational completion.
  - US1 (Kanban) and US2 (Grammar tracker) and US3 (Vocab/kanji SRS) are independent of each other and can proceed in parallel after Foundational.
  - US4 (Reading/listening logs), US5 (Mock tests), US6 (Mistake notebook) can start after Foundational; US6's "add to SRS" action is more meaningful once US3's SRS plumbing (T029, T050) exists, but the notebook itself (manual entries, resolve) doesn't require it.
  - US7 (Study plan/streak) and US8 (Dashboard) consume `review_logs` produced by US2/US3 activity — build after those, though their own UI code has no hard file dependency blocking earlier start.
  - US9 (Notes) is independent; its optional task/vocab/grammar links degrade gracefully if those entities don't exist yet.
  - US10 (Admin) can start after Foundational (auth/role check is in Phase 2) but is most useful once there's user content to moderate.
- **Polish (Phase 13)**: Depends on all desired user stories being complete.

### Recommended Priority Order (matches spec.md priorities)

1. Phase 1–2 (Setup + Foundational)
2. Phase 3 (US1 Kanban) — MVP checkpoint
3. Phase 4 (US2 Grammar) + Phase 5 (US3 Vocab/Kanji SRS) — the two P1 study pillars, can be parallelized
4. Phase 6 (US4 Reading/Listening) → Phase 7 (US5 Mock Tests) → Phase 8 (US6 Mistakes) → Phase 9 (US7 Streak) → Phase 10 (US8 Dashboard)
5. Phase 11 (US9 Notes)
6. Phase 12 (US10 Admin)
7. Phase 13 (Polish)

### Within Each User Story

- Route handlers / shared logic before UI that consumes them.
- Components before the pages that compose them.
- Story complete and independently testable before moving to the next.

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel.
- Within Foundational: all migration-writing tasks (T007–T016) touch different files and can be parallelized; RLS tasks (T017–T018) depend on the migrations existing first; seed tasks (T019–T020) are parallel with each other.
- Once Foundational completes, US1, US2, and US3 can be staffed and built in parallel (different route/component trees).
- US4, US5, US6 can similarly be parallelized once Foundational (and, for full US6 value, US3) is done.
- Within any story, tasks marked [P] touch different files and have no intra-story ordering dependency.

---

## Parallel Example: Foundational Phase

```bash
# Launch independent migration files together:
Task: "Create migration for boards/columns/tasks/task_checklist_items in apps/supabase/migrations/0002_kanban.sql"
Task: "Create migration for vocab_entries and user_vocab_progress in apps/supabase/migrations/0003_vocab.sql"
Task: "Create migration for grammar_points, user_grammar_status, grammar_confusable_pairs in apps/supabase/migrations/0004_grammar.sql"

# Launch seed data tasks together (after their migrations land):
Task: "Seed global vocab_entries sample in apps/supabase/seed.sql"
Task: "Seed global grammar_points + confusable pairs in apps/supabase/seed.sql"
```

## Parallel Example: User Story 1 (Kanban)

```bash
Task: "Board list page in apps/web/app/(app)/boards/page.tsx"
Task: "Board detail page shell in apps/web/app/(app)/boards/[boardId]/page.tsx"
Task: "Column component in apps/web/features/kanban/components/Column.tsx"
Task: "Task card component in apps/web/features/kanban/components/TaskCard.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: User Story 1 (Kanban)
4. **STOP and VALIDATE**: Run quickstart.md Scenario 1 independently
5. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. US1 (Kanban) → validate → demo (MVP)
3. US2 (Grammar) + US3 (Vocab/Kanji SRS) → validate each → demo (both P1 study pillars complete)
4. US4 → US5 → US6 → US7 → US8 → validate each → demo (full N2 study system)
5. US9 (Notes) → validate → demo
6. US10 (Admin) → validate → demo
7. Polish → production-ready

### Parallel Team Strategy

With multiple developers, after Foundational:
- Developer A: US1 (Kanban)
- Developer B: US2 (Grammar) then US6 (Mistakes, depends conceptually on US3's SRS plumbing existing)
- Developer C: US3 (Vocab/Kanji SRS) — build T029/T049/T050 early since US6/US7/US8 depend on the review pipeline it establishes
- Developer D: US4 (Reading/Listening) then US5 (Mock Tests)
- Converge on US7/US8 (Streak/Dashboard) once US2/US3 activity data exists
- US9 (Notes) and US10 (Admin) can be picked up by whoever frees up first

---

## Notes

- [P] tasks = different files, no dependencies.
- [Story] label maps task to specific user story for traceability.
- T029 (`apps/web/shared/srs/sm2.ts`) and T050 (`POST /api/reviews`) are the highest-leverage shared pieces — US3, US6, US7, and US8 all build on them; prioritize accordingly even though they're filed under Foundational/US3.
- Grammar SRS state lives on `user_grammar_status` (see data-model.md), not a separate table — T050 must branch on `itemType` to read/write the correct table (`user_vocab_progress`/`vocab_entries` vs. `user_grammar_status`).
- Commit after each task or logical group.
- Stop at any checkpoint to validate a story independently before continuing.
- Avoid: vague tasks, same-file conflicts, cross-story dependencies that break independence.
