# API Contracts: Habit Tracker & Theme System

Habit CRUD and per-day tick/untick are plain owner-scoped Supabase table access from the client under RLS (no route handler needed), matching this project's established pattern for simple ownership-scoped mutations (e.g. `CustomVocabManager`, `NoteEditor` in 001-tasknihongo). Only the two flows below need server-only concerns (cookie writes, service-role access) and get a route handler.

## POST /api/appearance

Sets the caller's light/dark mode and/or color theme. Writes `user_appearance_preferences` (upsert) and the `theme` cookie in the same response (research.md §3), so the two never drift.

**Auth**: required.

**Request**:
```json
{ "mode": "light", "themeId": "3d9f5c1e-..." }
```
Either field may be omitted to leave that half of the preference unchanged.

**Response 200**:
```json
{ "mode": "light", "theme": { "id": "3d9f5c1e-...", "slug": "teal-sunrise", "name": "Teal Sunrise" } }
```

**Response 400**: `themeId` doesn't resolve to an existing theme.

Covers FR-009, FR-010, FR-011, FR-013, FR-014.

---

## Admin routes (`/api/admin/**`)

Gated by the existing server-side role check in `apps/web/app/admin/layout.tsx`; uses the service-role client, same as every other admin route in 001-tasknihongo's contract.

### GET/POST/PUT/DELETE /api/admin/reference-data/themes

CRUD on `themes` (global reference data, admin-writable-only per RLS). Grouped alongside the existing `.../reference-data/{vocab,grammar,confusable-pairs}` routes.

- `POST`/`PUT` body: `{ slug, name, sortOrder, primaryLight, primaryForegroundLight, secondaryLight, secondaryForegroundLight, accentLight, accentForegroundLight, primaryDark, primaryForegroundDark, secondaryDark, secondaryForegroundDark, accentDark, accentForegroundDark }` (hex color strings).
- `DELETE`: if the theme being deleted is any user's current `user_appearance_preferences.theme_id`, those rows fall back per FR-017 (their `theme_id` goes `NULL` via the table's `ON DELETE SET NULL`; the app resolves `NULL` to the default theme at render time — no cascade cleanup needed beyond the FK).

Covers FR-012, FR-015, FR-017, FR-018.
