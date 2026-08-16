# Quickstart: Habit Tracker & Theme System

Validation guide for proving the feature works end-to-end once implemented. Assumes the schema in [data-model.md](./data-model.md) is migrated and the 4 seed themes are loaded.

## Prerequisites

- Existing TaskNihongo dev setup (001-tasknihongo's quickstart) running.
- Migrations for `habits`, `habit_completions`, `themes`, `user_appearance_preferences` applied.
- Seed data loaded: 4 default `themes` rows (FR-018).
- One `user` test account, one `admin` test account.

## Validation Scenarios

### 1. Habit tracker (User Story 1)

1. Sign in as the `user` test account, open the habit tracker page.
2. Add a habit ("Read 1 news article") → verify it appears as a new row (FR-001).
3. Tick today's cell for that habit → reload the page → verify it's still ticked (FR-004, FR-005, SC-002).
4. Tick a cell earlier in the current month, then tick it again → verify it toggles back to un-ticked (FR-004).
5. Click the previous-month navigation control → verify the grid shows that month's days and any completions recorded for it; click next twice to return to the current month (FR-007).
6. Verify the per-habit streak/count indicator updates after ticking (FR-008).
7. Delete the habit → verify it disappears from the grid, and re-creating a habit with the same name shows no leftover history (FR-002, FR-006).

### 2. Light/dark mode + color theme (User Story 2)

1. Sign in as a brand-new `user` account (no appearance preference row yet) → verify the app renders in light mode with no unreadable/low-contrast text (FR-009, SC-003).
2. Open Settings → switch to dark mode → verify the whole app re-renders dark immediately, with no flash on the next reload (FR-010, SC-005).
3. Select each of the 4 seeded themes in turn → verify the accent colors change while surfaces/status colors (background, danger, warning, success) stay consistent across all 4 (research.md §2).
4. Reload the page → verify the chosen mode + theme persisted (FR-013).
5. Sign in with the same account from a different browser (or an incognito window) → verify the correct mode + theme apply within the first page load, no flash of the default theme first (FR-014, SC-004).

### 3. Admin theme management (User Story 3)

1. Sign in as the `admin` test account → open the reference-data admin page's themes section → verify all 4 seeded themes are listed (Acceptance Scenario 1).
2. Create a new theme with a name and color values → sign in as the `user` test account → verify it now appears as a 5th option on the Settings page (Acceptance Scenario 2).
3. As admin, edit that theme's `primary` color → as the user with it selected, reload → verify the new color applies (Acceptance Scenario 3).
4. As admin, delete a theme currently selected by the `user` test account → sign in as that user → verify they now see the default theme rather than a broken/blank appearance (Acceptance Scenario 4, FR-017).
