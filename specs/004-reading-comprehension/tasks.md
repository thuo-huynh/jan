# Tasks: Reading Comprehension Passage Bank

**Input**: Design documents from `/specs/004-reading-comprehension/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md, quickstart.md

**Tests**: Not included — no test runner is wired up in this repo (`apps/web/tests/*` are empty
scaffolding, per root `CLAUDE.md`); not explicitly requested for this feature.

**Organization**: Tasks are grouped by user story to enable independent implementation and
testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)
- File paths are relative to the repo root unless otherwise noted

---

## Phase 1: Setup

**Purpose**: Shared type/validation scaffolding every later task imports from

- [X] T001 [P] Add `PassageSegment`, `ReadingPassage`, `PassageQuestion`, `ReadingPassageSet`
      types to `apps/web/features/reading-listening/types.ts` (shapes per data-model.md
      "Application-level shapes")
- [X] T002 [P] Add `readingPassageSchema` (title, segments, translationVn, tip, setId) and
      `readingPassageQuestionSchema` (questionText, 4 choices, correctChoiceIndex 0-3,
      explanation) to `apps/web/shared/validation/schemas.ts`

**Checkpoint**: Shared types and validation exist for all downstream work

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database schema and pure-logic helpers every user story depends on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T003 [P] Create migration `apps/supabase/migrations/0027_reading_passages.sql` —
      `reading_passage_sets`, `reading_passages`, `reading_passage_questions` tables + indexes,
      exact SQL in data-model.md
- [X] T004 [P] Create migration `apps/supabase/migrations/0028_rls_reading_passages.sql` — RLS
      for the three tables from T003 (owner-scoped via `user_id`; `reading_passage_questions` via
      join to `reading_passages.user_id`, per research.md §7)
- [X] T005 [P] Create migration
      `apps/supabase/migrations/0029_reading_passage_vocab_link.sql` — adds
      `vocab_entries.source_reading_passage_id` (nullable FK, `on delete set null`)
- [X] T006 [P] Create migration
      `apps/supabase/migrations/0030_mistake_notebook_reading_quiz.sql` — widens
      `mistake_notebook.source` check constraint to add `'reading_quiz'`
- [X] T007 [P] Create `apps/web/features/reading-listening/lib/mapReadingPassage.ts` — maps a
      `reading_passages` row (+ its joined `reading_passage_questions`) to the `ReadingPassage`
      app-level shape from T001
- [X] T008 [P] Create `apps/web/features/reading-listening/lib/gradeAnswer.ts` — pure
      `gradeAnswer(question, chosenIndex): AnswerState` helper per data-model.md "Derived, not
      persisted"

**Checkpoint**: Schema and pure helpers ready — user stories can now be implemented

---

## Phase 3: User Story 1 - Import a personal study document as a batch of ready-to-study passages (Priority: P1) 🎯 MVP

**Goal**: Paste a personal study-doc HTML page and have every `.dokkai-item` in it become a
browsable passage, grouped into one set named after its source tab.

**Independent Test**: Paste the sample HTML into the import tool; confirm every passage (title,
passage text, questions, answer key, explanations, translation, tip) appears in the passage list
afterward, grouped under one new set.

- [X] T009 [P] [US1] Create `apps/web/features/reading-listening/lib/parseReadingHtml.ts` —
      client-only `DOMParser`-based extractor for `.dokkai-item` blocks (title, passage segments,
      questions, translation, tip) + per-`[data-tab]` label lookup for set naming, per
      research.md §2
- [X] T010 [US1] Create `apps/web/features/reading-listening/components/ReadingPassageViewer.tsx`
      — render of a passage's title, segments, questions, translation, and tip (built together
      with its US2 grading/retry/Mistake-Notebook logic and US4 term popover in one pass rather
      than three incremental edits, since all three land on the same file — see T015/T022)
      (depends on T001, T007)
- [X] T011 [US1] Create
      `apps/web/features/reading-listening/components/ReadingHtmlImportForm.tsx` — paste-HTML
      textarea, parses via `parseReadingHtml` (T009), shows a preview (title + question count per
      passage) before confirming, then bulk-inserts one `reading_passage_sets` row plus its
      `reading_passages`/`reading_passage_questions` rows; shows a "nothing found" message when
      parsing yields zero passages (depends on T002, T009)
- [X] T012 [US1] Create `apps/web/features/reading-listening/components/ReadingPassageBank.tsx`
      — fetches-via-props the user's passages grouped by set, lists them (mirrors
      `GrammarList.tsx`'s set-grouped layout), opens `ReadingPassageViewer` (T010) for a selected
      passage, and hosts `ReadingHtmlImportForm` (T011) (depends on T010, T011)
- [X] T013 [US1] Create `apps/web/features/reading-listening/components/ReadingTabs.tsx` — tab
      switcher rendering the existing practice-log tab (current `ReadingLogManager` +
      `SessionStats` + `PassageTypeBreakdown`) alongside the new `ReadingPassageBank` (T012) tab
- [X] T014 [US1] Update `apps/web/app/(app)/learn/reading/page.tsx` — fetch
      `reading_passage_sets`/`reading_passages`/`reading_passage_questions` alongside the
      existing `reading_logs` query, map rows via `mapReadingPassage` (T007), render `ReadingTabs`
      (T013) instead of the log manager directly (depends on T007, T013)

**Checkpoint**: User Story 1 is fully functional and independently testable — passages can be
imported and browsed (question answering arrives in User Story 2)

---

## Phase 4: User Story 2 - Answer a passage's questions and get instant feedback (Priority: P2)

**Goal**: Click a choice, see instant correct/incorrect grading, the explanation, and a retry
option; a wrong first attempt logs a Mistake Notebook entry.

**Independent Test**: Open any passage, select a choice, confirm correct/incorrect highlighting
and the stored explanation appear, and that a "try again" action resets the question.

- [X] T015 [US2] Extend `ReadingPassageViewer.tsx` (T010) with per-question answer state (keyed
      by question id: `chosenIndex`, `isCorrect`, `hasBeenLoggedWrong`) using `gradeAnswer` (T008)
      — clicking a choice grades immediately, highlights the correct choice and (if different)
      the wrong pick, reveals the explanation, and offers a retry action that resets that
      question's state without affecting other questions on the same passage (depends on T008,
      T010)
- [X] T016 [US2] In the same file, on a question's first incorrect grading (`hasBeenLoggedWrong`
      false → true transition only), insert a `mistake_notebook` row with `source: 'reading_quiz'`
      and `content` summarizing the passage title, question text, chosen choice, and correct
      choice, per research.md §5 (depends on T006, T015)

**Checkpoint**: User Stories 1 AND 2 both work independently — passages can be imported, browsed,
and answered with grading + Mistake Notebook logging

---

## Phase 5: User Story 3 - Create a passage by hand (Priority: P3)

**Goal**: Fill in a passage's text and questions through a form as an alternative to import.

**Independent Test**: Fill in a title, passage text, and one question (choices + correct answer +
explanation) through the form, save, and confirm it appears in the passage list and is answerable
identically to an imported passage.

- [X] T017 [P] [US3] Create
      `apps/web/features/reading-listening/lib/parseInlinePassageSyntax.ts` — pure parser turning
      `{term|reading|meaning}`-annotated plain text into the same `PassageSegment[]` shape
      `parseReadingHtml.ts` (T009) produces, per research.md §3 (depends on T001)
- [X] T018 [P] [US3] Create
      `apps/web/features/reading-listening/components/ReadingPassageSetSelect.tsx` — set
      picker/combobox for assigning a manually-created passage to an existing set or leaving it
      ungrouped (mirrors `GrammarSetSelect.tsx`)
- [X] T019 [US3] Create `apps/web/features/reading-listening/components/ReadingPassageForm.tsx` —
      title, passage-body textarea (parsed via T017), optional translation/tip fields, dynamic
      add/remove question rows (question text + 4 choice inputs + correct-choice radio +
      explanation textarea), `ReadingPassageSetSelect` (T018) for optional set assignment;
      rejects saving a question with no correct choice marked, per FR-005 (depends on T002, T017,
      T018)
- [X] T020 [US3] Wire `ReadingPassageForm` (T019) into `ReadingPassageBank.tsx` (T012) behind a
      "create manually" action alongside the existing import action (depends on T012, T019)

**Checkpoint**: All three of User Stories 1-3 work independently — passages can be imported,
answered, and hand-authored

---

## Phase 6: User Story 4 - Send an unfamiliar word from a passage straight to the SRS queue (Priority: P4)

**Goal**: Tap/hover an annotated vocabulary term in a passage to see its reading/meaning and add
it to the SRS review queue in one action.

**Independent Test**: Open a passage with at least one annotated term, tap it, confirm its
reading/meaning shows, add it to the SRS queue, and confirm it appears in the vocab review list.

- [X] T021 [P] [US4] Create
      `apps/web/features/reading-listening/components/AttachTermToSrsButton.tsx` — pre-filled
      (word/reading/meaning already known from the term segment, no typing needed) insert into
      `vocab_entries` with `source_reading_passage_id` set, structurally mirroring
      `AttachToSrsButton.tsx`'s insert (depends on T005)
- [X] T022 [US4] Extend `ReadingPassageViewer.tsx` (T010/T015) so `term`-type segments render as
      tappable/hoverable inline spans showing a popover with the term's reading and meaning plus
      `AttachTermToSrsButton` (T021) (depends on T010, T021)

**Checkpoint**: All four user stories work independently and together

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Verification and consistency pass across the whole feature

- [X] T023 [P] Run `npx tsc --noEmit` and `npm run lint` from `apps/web` and fix any errors
      introduced by this feature
- [X] T024 [P] Confirm every icon-only control added by this feature (retry button, attach-to-SRS
      button, term popover trigger, delete button) has an `aria-label`, per `coding-style.md`
- [ ] T025 Walk through every scenario in `quickstart.md` end-to-end against a local dev server
      and confirm the Regression check (existing practice-log tab unaffected) — **blocked**: local
      Supabase requires Docker, which isn't running in this environment; `npx tsc --noEmit`,
      `npm run lint`, and `npm run build` all pass clean (T023) as a structural proxy, but no
      browser/DB walkthrough has been run. Needs a human pass with `supabase start` + `npm run dev`.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup (T001/T002) for shared types/schema — BLOCKS all
  user stories
- **User Story 1 (Phase 3)**: Depends on Foundational completion
- **User Story 2 (Phase 4)**: Depends on Foundational + User Story 1 (extends
  `ReadingPassageViewer.tsx` from T010)
- **User Story 3 (Phase 5)**: Depends on Foundational + User Story 1 (extends
  `ReadingPassageBank.tsx` from T012); independent of User Story 2
- **User Story 4 (Phase 6)**: Depends on Foundational + User Story 1 (extends
  `ReadingPassageViewer.tsx` from T010); independent of User Stories 2 and 3
- **Polish (Phase 7)**: Depends on all desired user stories being complete

### User Story Dependencies

Unlike a from-scratch feature, Stories 2-4 each *extend* a component User Story 1 creates
(`ReadingPassageViewer.tsx` or `ReadingPassageBank.tsx`) rather than standing fully apart — this
mirrors how the Grammar feature's own import/manual-entry/set-select pieces share components.
Each story is still independently *testable* once its tasks land: US1 alone already delivers a
working, browsable passage bank; US2, US3, and US4 each add one clearly-scoped capability on top
without requiring each other.

### Parallel Opportunities

- T001, T002 (Setup) in parallel
- T003-T008 (Foundational) all in parallel — six different files, content fully specified in
  data-model.md/research.md already
- T009 (US1 parser) can start in parallel with T010 (US1 viewer) — different files
- T017, T018 (US3) in parallel — different files
- T021 (US4 button) can be built in parallel with US1/US2/US3 work once Foundational is done —
  only its later wiring (T022) depends on `ReadingPassageViewer.tsx` existing
- T023, T024 (Polish) in parallel

---

## Parallel Example: Foundational Phase

```bash
Task: "Create migration apps/supabase/migrations/0027_reading_passages.sql"
Task: "Create migration apps/supabase/migrations/0028_rls_reading_passages.sql"
Task: "Create migration apps/supabase/migrations/0029_reading_passage_vocab_link.sql"
Task: "Create migration apps/supabase/migrations/0030_mistake_notebook_reading_quiz.sql"
Task: "Create apps/web/features/reading-listening/lib/mapReadingPassage.ts"
Task: "Create apps/web/features/reading-listening/lib/gradeAnswer.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T002)
2. Complete Phase 2: Foundational (T003-T008) — **CRITICAL**, blocks everything
3. Complete Phase 3: User Story 1 (T009-T014)
4. **STOP and VALIDATE**: run quickstart.md's User Story 1 section against a local dev server
5. Demo: import the sample HTML, browse the resulting passage bank

### Incremental Delivery

1. Setup + Foundational → schema and helpers ready
2. User Story 1 → import + browse works → demo (MVP)
3. User Story 2 → questions become answerable with grading + Mistake Notebook → demo
4. User Story 3 → manual passage creation → demo
5. User Story 4 → vocab-term attach-to-SRS → demo
6. Polish → typecheck/lint clean, full quickstart pass, accessibility check

---

## Notes

- [P] tasks = different files, no unresolved dependencies
- [Story] label maps task to specific user story for traceability
- Commit after each task or logical group, per root `CLAUDE.md`'s workflow rules (small related
  fixes may still share one commit; this is about checkpointing progress, not commit granularity)
- No test tasks included — no test runner is wired up in this repo (see Tests note above)
