# Quickstart: TaskNihongo

Validation guide for proving the feature works end-to-end once implemented. Assumes the Project Structure in [plan.md](./plan.md) and schema in [data-model.md](./data-model.md) are in place.

## Prerequisites

- Node.js 20 LTS, a Supabase project (local via `supabase start` or hosted), and `.env.local` populated with `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (server-only).
- Migrations applied: `supabase migration up`.
- Seed data loaded: `supabase db seed` — global N2 vocab (~6,000 words), kanji (~1,000), grammar points (~200), and a handful of confusable pairs (FR-012/FR-015/FR-017).
- Two test accounts: one `user` role, one `admin` role.

## Setup

```bash
npm install
npm run dev
```

## Validation Scenarios

### 1. Kanban core loop (User Story 1)
1. Sign in as the `user` test account.
2. Create a board → verify the four default columns appear (FR-005).
3. Add a task with a title, tag, due date, and a 4-item checklist; complete 2 items → verify progress shows 50% (FR-009).
4. Drag the task from Todo to In Progress → reload → verify persistence (FR-008, SC-003).
5. Filter the board by the task's tag → verify only matching tasks show (FR-010).

### 2. Grammar tracker + confusables (User Story 2)
1. Open the grammar tracker → verify a seeded point shows pattern, meaning, connection form, formality notes, example, and frequency tag (FR-012).
2. Change that point's status from "chưa học" to "đang ôn" → reload → verify it persists and the dashboard mastery count reflects it (FR-013).
3. Open the confusable comparison for a seeded pair (e.g. 〜として vs 〜にとって) → verify both points render side-by-side with the comparison note (FR-015).
4. Enable the "hide N3-level material" filter → verify points flagged `n3_overlap = true` disappear from the list (FR-016).
5. Add a personal mnemonic note to a grammar point → sign in as a second regular user → verify that note is not visible to them (FR-014, FR-004).

### 3. Blended vocab/kanji SRS review (User Story 3)
1. Add a custom vocab word tagged N2/custom → open the review queue (`GET /api/review-queue`) → verify it appears blended alongside due preloaded items, distinguishable by tag (Acceptance Scenario 1).
2. Review a kanji item in "recognition" mode, then a different kanji item in "writing recall" mode → verify both directions are presented correctly (FR-020).
3. Submit a "good" review via `POST /api/reviews` → verify `srsDueDate` moved later and `srsInterval` grew.
4. Submit an "again" review on a due item → verify `failCount` incremented and the item is due again sooner.
5. Toggle "review weak items only" → verify the queue narrows to items with high fail count/low ease (FR-021).

### 4. Reading & listening logs (User Story 4)
1. Log a reading session with source, passage type (e.g. 評論), duration, and comprehension score → verify it appears in history (FR-022).
2. Attach an unknown word from that session to the SRS queue → verify it now appears as a custom vocab entry linked back to the log (FR-023).
3. Log a second reading session with a different passage type and a lower score → open the dashboard → verify the by-passage-type breakdown surfaces the weaker type (FR-024).
4. Log a listening session with duration, comprehension score, and notes → verify it appears in listening history (FR-025).

### 5. Mock tests & exam countdown (User Story 5)
1. Record two mock test results on different dates with section scores → verify the trend chart plots both chronologically (FR-026, FR-027).
2. Set an exam date → verify the dashboard countdown widget shows the correct "days remaining" (FR-028).

### 6. Mistake notebook → SRS (User Story 6)
1. Manually add a mistake entry linked to a vocab item → verify it appears with source "manual" (FR-029).
2. Click "add to SRS queue" (`POST /api/mistakes/:id/add-to-srs`) → verify the linked vocab item's due date moves to today without resetting its interval/ease (FR-031).
3. Mark the mistake resolved → verify it's visually distinguished but still present in the log (FR-032).

### 7. Study plan & streak (User Story 7)
1. Set a daily goal (e.g. 10 grammar + 20 vocab reviews) → perform enough reviews to meet it → verify the dashboard marks today as goal-met (FR-033, FR-034).
2. View the heatmap → verify cell intensity reflects review volume across recent days (FR-034).
3. Skip a day with due items, then review the next day → verify the streak reset and restarted correctly, consistent with SRS streak logic (FR-036).

### 8. Consolidated dashboard (User Story 8)
1. With grammar/vocab/reading/listening/mock-test activity seeded, open `/learn/dashboard` (backed by `GET /api/dashboard`) → verify mastered/total grammar count, vocab/kanji learned count, review accuracy, streak, and weak-area summary all match the underlying seeded data (FR-037, SC-011).

### 9. Notes with linking (User Story 9)
1. Create a markdown note in a folder with a tag → verify formatted rendering (FR-038).
2. Link the note to a task and to a vocab entry → verify both links are visible from the note.
3. Delete the linked task → reopen the note → verify the note survives and the link shows as no longer available (FR-043).
4. Search notes by keyword → verify it's returned (FR-041).

### 10. Admin gate and moderation (User Story 10)
1. As the `user` test account, navigate directly to `/admin` → verify access is denied (FR-003).
2. Sign in as `admin` → search for the test user at `/admin/users` → verify signup date, last-active, status (FR-044).
3. Suspend the test user → sign back in as that user → verify access is blocked (FR-049).
4. Open `/admin/stats` → verify totals are non-zero and plausible (FR-047).
5. Edit a global grammar point or confusable pair at `/admin/reference-data` → as a regular user, verify the update is reflected in their grammar tracker (FR-048).

### 11. Cross-user isolation (SC-007)
1. As the `user` test account, note a grammar-status row id or vocab entry id (from network inspector).
2. Attempt a direct API/Supabase call for that resource id while authenticated as a *different* second regular user → verify the request is rejected (RLS denies access).

## Expected Outcome

All eleven scenarios pass without manual database edits or console errors, confirming the spec's acceptance scenarios and success criteria (SC-001–SC-011) are met by the implementation.
