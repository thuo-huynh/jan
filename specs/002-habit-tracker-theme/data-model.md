# Phase 1 Data Model: Habit Tracker & Theme System

All tables live in Supabase-managed Postgres, following `001-tasknihongo/data-model.md`'s conventions: `user_id` references `profiles.id`, every user-owned table has RLS enabled with an owner-scoped policy, global/reference tables follow the `user_id IS NULL` = shared, service-role-writable pattern already used by `vocab_entries`/`grammar_points`.

## habits

| Column | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| user_id | uuid, FK → profiles.id | owner; no sharing (Assumptions: private per-user) |
| name | text | short free text (FR-001), reasonable length cap enforced at the validation layer |
| created_at | timestamptz | |

Deleting a habit cascades to `habit_completions` (FR-006 — hard delete, no history retained).

## habit_completions

| Column | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| habit_id | uuid, FK → habits.id, ON DELETE CASCADE | |
| user_id | uuid, FK → profiles.id | denormalized from the habit for a simple owner-scoped RLS policy without a join |
| completion_date | date | the user's local calendar day being marked done (Assumptions: local day, not UTC) |
| created_at | timestamptz | |

Unique constraint on `(habit_id, completion_date)`. Row existence *is* completion (research.md §4) — ticking inserts a row, un-ticking deletes it; no boolean column.

## themes *(global reference data, admin-managed — US3)*

| Column | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| slug | text, unique | used as the `data-theme` attribute value (research.md §2); URL/CSS-safe |
| name | text | display name shown in the settings picker (FR-011) |
| sort_order | int | controls display order in the picker; admin-settable |
| primary_light | text | hex color |
| primary_foreground_light | text | hex color |
| secondary_light | text | hex color |
| secondary_foreground_light | text | hex color |
| accent_light | text | hex color |
| accent_foreground_light | text | hex color |
| primary_dark | text | hex color |
| primary_foreground_dark | text | hex color |
| secondary_dark | text | hex color |
| secondary_foreground_dark | text | hex color |
| accent_dark | text | hex color |
| accent_foreground_dark | text | hex color |
| created_at / updated_at | timestamptz | |

Global: all authenticated users can SELECT; only service-role (admin routes) can INSERT/UPDATE/DELETE (FR-015), matching `vocab_entries`/`grammar_points`' global-row RLS shape. Exactly 4 rows are seeded (FR-018); admins may add/edit/remove beyond that (US3).

## user_appearance_preferences *(one row per user)*

| Column | Type | Notes |
|---|---|---|
| user_id | uuid, PK, FK → profiles.id | one row per user, same shape as `study_goals` |
| theme_id | uuid, FK → themes.id, ON DELETE SET NULL | nullable — see fallback below |
| mode | text, enum('light', 'dark') | default `'light'` (FR-009) |
| updated_at | timestamptz | |

A user with no row yet (first login after this feature ships, or `theme_id` went `NULL` because an admin deleted their selected theme — FR-017) is treated as `mode = 'light'` + the lowest-`sort_order` theme (FR-016/FR-017) — resolved in application code, not a DB default, since "the default theme" is a runtime lookup against `themes`, not a fixed id.

## RLS Summary (additions)

| Table | Policy shape |
|---|---|
| habits, habit_completions | owner-only via `user_id`; admin via service-role (consistent with other owner-scoped content) |
| themes | all authenticated users SELECT; only service-role writes (global reference data) |
| user_appearance_preferences | owner-only via `user_id`; admin via service-role |

## State Transitions

- **Habit**: created → (any number of completion toggles on `habit_completions`, independent of the habit row itself) → deleted (terminal; cascades completions).
- **Habit day**: not-done → done (insert) → not-done (delete) — freely reversible, no history of *when* it was toggled beyond `completion_date` itself.
- **User appearance preference**: no row (implicit light + default theme) → row created/updated on first explicit choice (FR-016) → updated on every subsequent change; `theme_id` may transition to `NULL` if an admin deletes the referenced theme (FR-017), which the app treats identically to "no row" for theme purposes.
