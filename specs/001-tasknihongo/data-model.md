# Phase 1 Data Model: TaskNihongo

All tables live in Supabase-managed Postgres. `user_id` columns reference `profiles.id` (which itself equals `auth.users.id`). Every user-owned table has RLS enabled with an owner-scoped policy (see `## RLS Summary` below); see [research.md](./research.md) §2 for the authorization rationale. This revision incorporates the user-supplied schema for the N2-focused learning tracker plus two additions (`user_grammar_status`, `study_goals`) needed to satisfy FR-013 and FR-033 without overloading the global `grammar_points` rows — noted inline where added beyond the original starting-point schema.

## profiles

| Column | Type | Notes |
|---|---|---|
| id | uuid, PK | = `auth.users.id` |
| email | text | mirrored from auth for admin listing convenience |
| role | text, enum('user','admin') | default `'user'` |
| status | text, enum('active','suspended') | default `'active'` (FR-049) |
| created_at | timestamptz | signup date (FR-044) |
| last_active_at | timestamptz | updated on authenticated activity |

## boards / columns / tasks / task_checklist_items

Unchanged from the original Kanban scope:

- **boards**: id, user_id (FK), name, created_at
- **columns**: id, board_id (FK), name, position
- **tasks**: id, column_id (FK), board_id (FK, denormalized for RLS/filtering), title, description, tags (text[]), due_date, progress_pct, attachment_count, assignee_id (FK → profiles, nullable), position, created_at/updated_at
- **task_checklist_items**: id, task_id (FK), text, completed, position

Ownership derived via `board_id → boards.user_id` (join-based RLS policy for columns/tasks/checklist items).

## vocab_entries

| Column | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| user_id | uuid, FK → profiles.id, **nullable** | `NULL` = global/shared N2 reference entry (FR-017); non-null = user's own custom entry (FR-018) |
| word | text | |
| reading | text | furigana |
| meaning | text | |
| example | text | nullable |
| jlpt_level | text | 'N2' for reference content; custom entries may carry any level tag the user chooses |
| is_kanji | boolean | distinguishes a kanji-recognition item from a vocabulary word (FR-020's dual-mode review) |
| srs_due_date | date | defaults to today on creation (or on first per-user touch of a global row — research.md §7) |
| srs_interval | int | days; SM-2-style state (research.md §3) |
| srs_ease | numeric | SM-2-style ease factor |
| srs_repetitions | int | consecutive-correct counter |
| fail_count | int | default 0; increments on failed review, powers "weak items only" mode (FR-021) |
| created_at | timestamptz | |

Ownership: rows with non-null `user_id` are owner-scoped; rows with `user_id IS NULL` are globally readable by any authenticated user, admin-writable only (FR-048). Per-user SRS state (`srs_*`, `fail_count`) on a global row is not meaningful directly on that shared row — see **user_vocab_progress** below, which is how per-user scheduling against a shared reference word is actually stored without mutating the shared row.

## user_vocab_progress *(added — per-user SRS state against a global vocab_entries row)*

| Column | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| user_id | uuid, FK → profiles.id | |
| vocab_id | uuid, FK → vocab_entries.id | may point to a global (`user_id IS NULL`) or the user's own custom row |
| srs_due_date | date | |
| srs_interval | int | |
| srs_ease | numeric | |
| srs_repetitions | int | |
| fail_count | int | |
| created_at / updated_at | timestamptz | created lazily on first review (research.md §7) |

Unique constraint on `(user_id, vocab_id)`. For a user's **own custom** vocab entry, the `srs_*`/`fail_count` columns directly on `vocab_entries` are used instead (no ambiguity, since only that user can ever review it) — `user_vocab_progress` rows are only created for reviews of **global** reference vocab/kanji, which is the case that needs per-user state decoupled from a shared row. The review API (`/api/reviews`) reads/writes whichever of the two locations applies based on whether `vocab_entries.user_id` is null.

## grammar_points

| Column | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| user_id | uuid, FK → profiles.id, **nullable** | `NULL` = one of the ~200 global N2 reference points (FR-012); non-null reserved for forward compatibility, not used by any v1 user story (all grammar content in scope is the shared reference set) |
| pattern | text | 文型 |
| meaning | text | |
| connection_form | text | 接続 |
| formality_nuance | text | nullable |
| example_sentences | text[] | |
| jlpt_level | text | 'N2' |
| frequency_tag | text | e.g. 'high' / 'medium' / 'low' |
| n3_overlap | boolean | default false; drives the level-diff filter (FR-016) |
| created_at | timestamptz | |

## user_grammar_status *(added — replaces putting per-user status/notes directly on the shared grammar_points row)*

| Column | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| user_id | uuid, FK → profiles.id | |
| grammar_point_id | uuid, FK → grammar_points.id | |
| status | text, enum('not_started','learning','mastered') | maps to chưa học / đang ôn / đã thuộc (FR-013) |
| notes_user | text | personal notes/mnemonics, markdown (FR-014) |
| srs_due_date | date | nullable until first grammar review (research.md §3 — grammar points join the blended SRS review queue) |
| srs_interval | int | nullable until first review |
| srs_ease | numeric | nullable until first review |
| srs_repetitions | int | default 0 |
| fail_count | int | default 0; same "weak items" semantics as `vocab_entries.fail_count` (FR-021) |
| updated_at | timestamptz | |

Unique constraint on `(user_id, grammar_point_id)`, created lazily on first status change, note, or review (default status is implicitly "not_started" and SRS fields null for any point without a row — research.md §7). *Note: the user-supplied schema sketch put `status` and `notes_user` directly on `grammar_points`; since `grammar_points` rows with `user_id IS NULL` are shared across all users, per-user status/notes/SRS-state cannot live on that same row without either duplicating the global row per user (defeats the point of a shared catalog) or storing multiple users' private data on one row (an isolation violation). This table is the corrected, RLS-clean home for that data, and is also where `POST /api/reviews`' `itemType: "grammar"` case reads/writes SRS state (contracts/api.md), keeping it consistent with the vocab side instead of needing a second parallel table.*

## grammar_confusable_pairs

| Column | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| grammar_point_id_a | uuid, FK → grammar_points.id | |
| grammar_point_id_b | uuid, FK → grammar_points.id | |
| comparison_note | text | markdown, explains the distinction (FR-015) |
| created_at | timestamptz | |

Global reference data (both constituent points are expected to be global rows); admin-writable, all-authenticated-users-readable, matching `grammar_points`' global-row policy.

## reading_logs

| Column | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| user_id | uuid, FK → profiles.id | |
| source | text | |
| passage_type | text, nullable | 随筆/評論/案内/etc. (FR-022) |
| duration_min | int | |
| comprehension_score | int | self-rated |
| notes | text | nullable |
| practiced_at | timestamptz | |

## listening_logs

| Column | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| user_id | uuid, FK → profiles.id | |
| source | text | |
| duration_min | int | |
| comprehension_score | int | self-rated |
| notes | text | nullable |
| practiced_at | timestamptz | |

## mock_test_results

| Column | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| user_id | uuid, FK → profiles.id | |
| test_date | date | |
| vocab_grammar_score | int | 文字・語彙・文法 section |
| reading_score | int | 読解 section |
| listening_score | int | 聴解 section |
| total_score | int | |
| created_at | timestamptz | |

## mistake_notebook

| Column | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| user_id | uuid, FK → profiles.id | |
| source | text, enum('mock_test','manual') | FR-029 |
| content | text | |
| linked_vocab_id | uuid, FK → vocab_entries.id, nullable, ON DELETE SET NULL | FR-030 |
| linked_grammar_id | uuid, FK → grammar_points.id, nullable, ON DELETE SET NULL | FR-030 |
| resolved | boolean | default false (FR-032) |
| created_at | timestamptz | |

## notes

| Column | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| user_id | uuid, FK → profiles.id | owner |
| title | text | |
| body_markdown | text | FR-038 |
| folder | text | nullable (FR-039) |
| tags | text[] | FR-039 |
| pinned | boolean | default false (FR-040) |
| linked_task_id | uuid, FK → tasks.id, nullable, ON DELETE SET NULL | FR-042/FR-043 |
| linked_vocab_id | uuid, FK → vocab_entries.id, nullable, ON DELETE SET NULL | FR-042/FR-043 |
| search_vector | tsvector, generated | over `title || body_markdown` (research.md §6), GIN-indexed |
| created_at / updated_at | timestamptz | |

`ON DELETE SET NULL` on link columns is how FR-043 ("note survives, link handled gracefully") is implemented at the schema level.

## review_logs

| Column | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| user_id | uuid, FK → profiles.id | |
| vocab_id | uuid, FK → vocab_entries.id, **nullable** | set when this review was a vocab/kanji item |
| grammar_id | uuid, FK → grammar_points.id, **nullable** | set when this review was a grammar item |
| reviewed_at | timestamptz | default now() |
| result | text, enum('again','hard','good','easy') | graded response (research.md §3) |

Exactly one of `vocab_id`/`grammar_id` is non-null per row (check constraint). Powers accuracy, streak, heatmap (research.md §10), and weak-area dashboard aggregation.

## study_goals *(added — needed for FR-033/FR-034, not in the original schema sketch)*

| Column | Type | Notes |
|---|---|---|
| user_id | uuid, PK, FK → profiles.id | one row per user |
| daily_grammar_target | int | default 0 |
| daily_vocab_target | int | default 0 |
| updated_at | timestamptz | |

Used by `lib/study/heatmap.ts` to compute goal-met days from `review_logs` counts grouped by day (research.md §10).

## RLS Summary

| Table | Policy shape |
|---|---|
| profiles | user can SELECT/UPDATE own row; admin (service-role) can SELECT/UPDATE all |
| boards, columns, tasks, task_checklist_items | owner-only via `user_id` or join to `boards.user_id`; admin via service-role |
| vocab_entries | owner-only when `user_id` is non-null; all authenticated users SELECT where `user_id IS NULL`; only service-role writes rows with `user_id IS NULL` |
| user_vocab_progress | owner-only via `user_id` |
| grammar_points | all authenticated users SELECT where `user_id IS NULL` (the v1 case); only service-role writes those rows |
| user_grammar_status | owner-only via `user_id` |
| grammar_confusable_pairs | all authenticated users SELECT; only service-role writes |
| reading_logs, listening_logs, mock_test_results, mistake_notebook, study_goals | owner-only via `user_id`; admin via service-role |
| notes | owner-only via `user_id`; admin via service-role |
| review_logs | owner-only via `user_id`; admin via service-role (for stats aggregation, FR-047) |

Admin aggregate stats (FR-047) and reference-data management (FR-048) are computed/written via service-role queries in `app/api/admin/**` route handlers — reachable only after the server-side role check in `app/admin/layout.tsx` / `middleware.ts` (FR-003).

## State Transitions

- **Task**: created in a column → moved between columns (position/column_id change) → optionally landed in a "Done"-named column — no enforced linear state machine.
- **Vocab/kanji SRS state** (on `vocab_entries` directly for custom entries, or `user_vocab_progress` for global entries): transitions only via a review submission (server-computed, research.md §3); "good"/"easy" grow interval and repetitions, "again" resets repetitions to 0, shrinks interval to the shortest value, and increments `fail_count`; "hard" grows interval modestly.
- **Grammar status** (`user_grammar_status.status`): `not_started` → `learning` → `mastered`, user-driven (FR-013), independent of but informed by grammar SRS review results (a point can be manually marked mastered, or the UI can suggest mastery after N consecutive correct SRS reviews — implementation detail for tasks phase).
- **Mistake notebook entry**: created (`resolved = false`) → optionally linked item added to SRS (nudges due date, research.md §9) → marked `resolved = true` (terminal but retained, not deleted, per FR-032).
- **Profile status**: `active` → `suspended` (admin action, FR-045) → back to `active` (reinstate) or account deleted (terminal).
