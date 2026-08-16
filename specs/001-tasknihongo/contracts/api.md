# Phase 1 Contracts: TaskNihongo

Most CRUD (boards, columns, tasks, checklist items, reading/listening logs, mock test results, mistake notebook entries, grammar status/notes, notes) goes directly from the Next.js client/server components to Supabase via the generated table client, protected by RLS (see [data-model.md](./data-model.md) RLS Summary) — those are not custom contracts, they're standard PostgREST-shaped Supabase calls and don't need bespoke documentation here.

This file documents the **custom Route Handlers** that exist because the operation must be server-authoritative or spans multiple tables atomically, per FR-019/FR-020/FR-021 (SRS), FR-031 (mistake→SRS), and FR-003/FR-044–049 (admin).

## POST /api/reviews

Submits a graded SRS review for one vocab/kanji item **or** one grammar point; server computes the new schedule (never trust a client-submitted interval).

**Auth**: required (any authenticated `user`); RLS additionally scopes the referenced item to one the caller can access (owned custom entry, or any global reference row).

**Request body**:
```json
{
  "itemType": "vocab | grammar",
  "itemId": "uuid",
  "direction": "reading_to_meaning | kanji_recognition | kanji_writing_recall",
  "result": "again | hard | good | easy"
}
```
`direction` is only meaningful/required when `itemType` is `"vocab"` and the item's `is_kanji` is true (FR-020); omitted otherwise.

**Behavior**:
1. Resolve current SRS state: for `itemType: "vocab"` with a global (`user_id IS NULL`) item, read/write `user_vocab_progress`; for a user-owned custom item, read/write `vocab_entries` directly. For `itemType: "grammar"`, read/write the SRS columns on `user_grammar_status` (data-model.md), scoped to the caller — creating the row lazily if this is the item's first review.
2. Run `lib/srs/sm2.ts` with the current state + `result` → new state + `nextDueDate`; increment `fail_count` on `"again"`.
3. Persist the updated state; insert a `review_logs` row with exactly one of `vocab_id`/`grammar_id` set.
4. Return the updated schedule.

**Response 200**:
```json
{
  "itemType": "vocab",
  "itemId": "uuid",
  "srsInterval": 6,
  "srsEase": 2.5,
  "srsDueDate": "2026-08-21",
  "failCount": 0,
  "streak": 4
}
```

**Errors**: `401` unauthenticated, `404` item not found/not accessible (RLS), `400` invalid `result`/`itemType`/`direction` combination.

**Covers**: User Story 3 Acceptance Scenarios 2–4 (dual-direction review, interval growth/reset, weak-item fail-count tracking).

---

## GET /api/review-queue

Returns the blended, due-today review queue combining vocab/kanji and grammar items for the caller, optionally restricted to weak items.

**Auth**: required.

**Query params**: `weakOnly=true|false` (default false; when true, filters to items above a fail-count/below-ease threshold — research.md §3, thresholds are an implementation detail).

**Response 200**:
```json
{
  "items": [
    { "itemType": "vocab", "itemId": "uuid", "isKanji": true, "isCustom": false, "dueDate": "2026-08-15" },
    { "itemType": "grammar", "itemId": "uuid", "dueDate": "2026-08-15" }
  ]
}
```

**Covers**: User Story 3 Acceptance Scenarios 1, 4 (blended queue, weak-only mode).

---

## POST /api/mistakes/:id/add-to-srs

One-click action that nudges the mistake's linked item to be due for review soon, without a full SRS reset (research.md §9).

**Auth**: required; caller must own the `mistake_notebook` row (RLS).

**Behavior**: `404` if the mistake entry has no `linked_vocab_id`/`linked_grammar_id` (Edge Case: manual entry with no link — action unavailable). Otherwise sets the linked item's per-user `srs_due_date` to today (or next available slot), leaving interval/ease/repetitions untouched.

**Response 200**: `{ "linkedItemType": "vocab", "linkedItemId": "uuid", "srsDueDate": "2026-08-15" }`

**Covers**: User Story 6 Acceptance Scenario 2 (FR-031).

---

## GET /api/dashboard

Aggregates the consolidated progress dashboard in one call rather than N client-side queries.

**Auth**: required.

**Response 200**:
```json
{
  "grammar": { "mastered": 42, "total": 200 },
  "vocabKanjiLearned": 850,
  "reviewAccuracy": 0.87,
  "currentStreak": 12,
  "weakAreas": [
    { "type": "reading_passage_type", "label": "評論", "score": 0.61 },
    { "type": "grammar_confusable", "label": "〜わけではない vs 〜わけがない", "score": 0.4 }
  ],
  "examCountdownDays": 47
}
```

**Covers**: User Story 8 (FR-037), User Story 5's countdown widget (FR-028).

---

## Admin routes (`/api/admin/**`)

All routes in this group are additionally gated by the server-side role check in `app/admin/layout.tsx` (session role must be `admin`); route handlers use the service-role Supabase client (`lib/supabase/admin.ts`) since admin reads/writes intentionally cross the per-user RLS boundary.

### GET /api/admin/users?query=&page=

Lists/searches user profiles. **Response**: array of `{ id, email, signupDate, lastActiveAt, status }`. Covers FR-044.

### POST /api/admin/users/:id/suspend

Sets `profiles.status = 'suspended'`; also invalidates the user's active sessions server-side. Covers FR-045, FR-049, and the Edge Case "suspended user's session is already active."

### DELETE /api/admin/users/:id

Requires `{ "confirm": true }`; returns `409` if `:id` is the caller's own account or the last remaining admin (Edge Case). Covers FR-045.

### GET /api/admin/content?type=tasks|notes|vocab|grammar_notes|reading_logs|listening_logs|mistakes&query=

Lists/searches user-generated content across owners for moderation. Covers FR-046.

### DELETE /api/admin/content/:type/:id

Removes a specific content item. Covers FR-046.

### GET /api/admin/stats

**Response**:
```json
{
  "totalUsers": 128,
  "activeUsers7d": 41,
  "activeUsers30d": 87,
  "totalTasks": 940,
  "totalNotes": 315,
  "totalVocab": 2210
}
```
Covers FR-047.

### GET/POST/PUT/DELETE /api/admin/reference-data/vocab
### GET/POST/PUT/DELETE /api/admin/reference-data/grammar
### GET/POST/PUT/DELETE /api/admin/reference-data/confusable-pairs

CRUD on the global (`user_id IS NULL`) rows of `vocab_entries`, `grammar_points`, and `grammar_confusable_pairs` respectively. Covers FR-017, FR-012, FR-015, FR-048.

---

## Auth flow contract (Supabase Auth, not custom code)

- Sign-up/sign-in: Supabase Auth email/password (+ optional OAuth provider), handled by `@supabase/ssr` helpers; no custom password-handling code (FR-001).
- On successful auth, a `profiles` row is created/synced via a Postgres trigger on `auth.users` insert (standard Supabase pattern) — not a custom API contract.
- `middleware.ts` refreshes the session on every request and redirects unauthenticated requests away from any `(app)` or `/admin` route (FR-001, FR-003).
