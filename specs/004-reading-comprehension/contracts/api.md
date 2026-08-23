# Phase 1 Contracts: Reading Comprehension Passage Bank

No new custom Route Handlers. Following the same split `specs/001-tasknihongo/contracts/api.md`
and `specs/003-expand-study-plan/contracts/api.md` already document for this project:

- Creating passages/questions/sets (both the HTML-import bulk insert and the manual-creation
  form) is standard owner-scoped Supabase `insert`, the same client-side pattern
  `GrammarHtmlImportForm.tsx` and `GrammarPointForm.tsx` already use — not a custom contract.
- Deleting a passage is a standard owner-scoped Supabase `delete` (cascades to its questions via
  `on delete cascade`), same pattern `ReadingLogManager.tsx`'s `handleDelete` already uses.
- Attaching a passage vocab term to the SRS queue is a standard owner-scoped Supabase `insert`
  into `vocab_entries` with `source_reading_passage_id` set, structurally identical to the
  existing `AttachToSrsButton.tsx`'s insert (just a different provenance column).
- Logging a wrong first answer to the Mistake Notebook is a standard owner-scoped Supabase
  `insert` into `mistake_notebook` with `source: 'reading_quiz'`, fired client-side from
  `ReadingPassageViewer` at the moment a question is first graded incorrect — no server round
  trip beyond that insert, no new endpoint.
- The HTML parser (`parseReadingHtml.ts`) and the inline-syntax parser
  (`parseInlinePassageSyntax.ts`) are pure functions run inside the client components that call
  them (`ReadingHtmlImportForm`, `ReadingPassageForm`) — there is no server-side parsing step and
  nothing to version or authenticate separately from the form itself.
- Quiz grading (`gradeAnswer`) is a pure function run entirely client-side against data already on
  the page — no request/response contract exists for "submit an answer."
