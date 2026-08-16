# Feature Specification: Habit Tracker & Theme System

**Feature Branch**: `002-habit-tracker-theme`

**Created**: 2026-08-16

**Status**: Draft

**Input**: User description: "Add two new capabilities to TaskNihongo: (1) a habit tracker calendar where users create/delete custom habits and see a table/grid — habits as rows, calendar days as columns — where they tick a checkbox to mark a habit done on a given day, separate from the existing SRS study streak heatmap; (2) a theme system — fix the current site theme so it defaults to a proper light theme, add dark/light mode support, and add a user settings page where the signed-in user can pick from 4 predefined themes stored in a Supabase config table (not hardcoded), with the selection persisting per user."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Track daily habits on a calendar grid (Priority: P1)

A signed-in user creates personal habits they want to build (e.g., "Do 30 min of shadowing," "Review flashcards before bed"), then sees a grid with each habit as a row and calendar days as columns, and ticks a checkbox in a day's column to mark that habit done for that day. Habits no longer wanted can be deleted.

**Why this priority**: This is the entire value of the feature — without it there's nothing to test or demo. It stands alone from every other TaskNihongo feature (Kanban, SRS, notes) and needs nothing else to be useful.

**Independent Test**: Can be fully tested by creating a habit, ticking it done for today and a past day, un-ticking a day, and deleting the habit — independent of every other feature in the app.

**Acceptance Scenarios**:

1. **Given** a signed-in user with no habits yet, **When** they add a new habit with a name, **Then** it appears as a new row in the habit grid.
2. **Given** a habit row and the grid showing the current calendar month's days, **When** the user ticks the checkbox under today's date, **Then** that day's cell shows as completed for that habit and remains so on page reload.
3. **Given** a day already ticked as done, **When** the user ticks it again, **Then** it toggles back to not-done.
4. **Given** a user with multiple habits, **When** they view the grid, **Then** each habit's completion history is shown independently in its own row, and a per-habit completion streak/count is visible.
5. **Given** a habit the user no longer wants to track, **When** they delete it, **Then** it no longer appears in the grid and its history is gone.
6. **Given** the grid showing the current month, **When** the user clicks the previous/next month navigation control, **Then** the grid updates to show that month's days and each habit's completion state for those days.

---

### User Story 2 - Customize light/dark mode and color theme (Priority: P2)

A signed-in user opens a settings page and chooses their preferred light/dark mode and one of 4 predefined color themes; the app immediately reflects the choice and remembers it the next time they sign in, on any device.

**Why this priority**: Meaningfully improves comfort and personalization and directly addresses a reported defect (the site currently isn't presenting a proper light theme by default), but the app is fully usable without it — ranked below the habit tracker, which is new functionality rather than a refinement.

**Independent Test**: Can be fully tested by opening settings, switching between light and dark mode, selecting each of the 4 themes, reloading the page, and signing in from a different browser to confirm the preference follows the account.

**Acceptance Scenarios**:

1. **Given** a user who has never set a preference, **When** they load the app, **Then** it renders in light mode by default (not dark).
2. **Given** the settings page, **When** the user switches to dark mode, **Then** the whole app immediately re-renders in dark mode.
3. **Given** the settings page, **When** the user selects one of the 4 available color themes, **Then** the app's accent colors update to match, in both light and dark mode.
4. **Given** a user has set light/dark mode and a color theme, **When** they sign in again later (same or different browser), **Then** their saved preference is applied automatically.

---

### User Story 3 - Admin manages the available color themes (Priority: P3)

An admin opens the admin panel and can view, add, edit, and remove the color themes available for users to choose from in User Story 2, so the theme catalog can grow or change without a code deployment.

**Why this priority**: Only admins need this, and the app is fully usable by regular users without it as long as at least the seeded themes exist — ranked below both end-user-facing stories, consistent with how the existing admin reference-data management (vocab/grammar) is the lowest-priority story in this project.

**Independent Test**: Can be fully tested by an admin account creating a new theme, confirming it appears as a selectable option on a regular user's settings page, then editing and deleting a theme and confirming those changes are reflected the same way.

**Acceptance Scenarios**:

1. **Given** the admin panel, **When** an admin views the theme management page, **Then** they see all current themes (including the seeded ones).
2. **Given** the theme management page, **When** an admin adds a new theme with a name and color values, **Then** it becomes selectable on the end-user settings page (User Story 2) without redeploying the app.
3. **Given** an existing theme, **When** an admin edits its color values, **Then** users who have that theme selected see the updated colors on their next page load.
4. **Given** an existing theme, **When** an admin deletes it, **Then** it's no longer selectable, and any user who had it selected falls back to the default theme.

---

### Edge Cases

- What happens when a user deletes a habit that has completion history? (Resolved by FR-006 — history is discarded with the habit.)
- What happens when a user tries to tick a future date? System allows it (e.g., planning ahead is not explicitly prohibited) but the grid's default view emphasizes past/today.
- What happens if the theme config table is unreachable, empty, or an admin deletes the user's currently-selected theme? System falls back to a single built-in default theme rather than failing to render (see FR-017).
- What happens when a user has zero habits? Grid shows an empty state with a clear call-to-action to add the first habit.
- What happens if two browser tabs toggle the theme at nearly the same time? Last write wins; no merge conflict handling needed.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Users MUST be able to create a new habit with a short name.
- **FR-002**: Users MUST be able to delete an existing habit.
- **FR-003**: System MUST display the user's habits as rows in a grid where columns are calendar days.
- **FR-004**: Users MUST be able to toggle a specific habit's completion state for a specific day by clicking/tapping a checkbox in that day's column.
- **FR-005**: System MUST persist each habit's per-day completion state so it survives page reloads and future sessions.
- **FR-006**: Deleting a habit MUST also remove its completion history (hard delete; no separate archive/undo in this version).
- **FR-007**: The habit grid MUST show one calendar month at a time (defaulting to the current month), with controls to navigate to the previous and next month.
- **FR-008**: System MUST show, per habit, a simple completion indicator (e.g., current consecutive-day streak or a count of completed days in the visible window).
- **FR-009**: System MUST default every user to light mode until they explicitly choose otherwise.
- **FR-010**: Users MUST be able to switch between light mode and dark mode from a settings page.
- **FR-011**: Users MUST be able to choose one of exactly 4 predefined color themes from the settings page.
- **FR-012**: The set of available color themes (name + the color values each theme applies) MUST be stored in a database configuration table rather than hardcoded in application code, so its contents can be inspected/updated without a code change.
- **FR-013**: System MUST persist each user's light/dark mode choice and color theme choice tied to their account, so the same preference applies across devices/browsers.
- **FR-014**: System MUST apply the user's saved theme preference automatically on every subsequent sign-in.
- **FR-015**: Admins MUST be able to view, create, edit, and delete color themes from the admin panel, consistent with how other reference data (vocab, grammar) is already managed there.
- **FR-016**: If a user has no saved theme preference row yet (e.g., first login after this feature ships), system MUST behave as if they selected light mode and the first/default color theme.
- **FR-017**: If an admin deletes a theme that one or more users currently have selected, those users' effective theme MUST fall back to the default theme rather than leaving them with a broken/missing selection.
- **FR-018**: The system MUST start with exactly 4 pre-seeded themes so User Story 2 is usable immediately without requiring an admin to configure anything first.

### Key Entities *(include if feature involves data)*

- **Habit**: A user-owned, named thing they want to track daily. Belongs to exactly one user.
- **Habit Completion**: A record that a specific habit was marked done on a specific calendar day, for a specific user. One habit has at most one completion record per day (ticking again removes it).
- **Theme**: A named, predefined color palette (one of exactly 4) available for users to choose, defined centrally rather than per-user. Provides the color values the app needs for both light and dark mode under that theme.
- **User Appearance Preference**: One record per user capturing their chosen light/dark mode and their chosen Theme; applied on every page load once signed in.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can create a habit and mark it done for the day in under 10 seconds from opening the habit page.
- **SC-002**: 100% of habit completion ticks persist correctly across a page reload and a new sign-in session.
- **SC-003**: A new user who has never configured appearance sees a properly readable light-mode interface on first load, with no unreadable/low-contrast text.
- **SC-004**: A user's chosen mode and theme are correctly re-applied within 1 page load after signing in from a different browser or device.
- **SC-005**: Switching mode or theme updates the visible UI with no noticeable flash of the wrong theme on subsequent loads.

## Assumptions

- Habit tracking is per-user and private — there is no shared/team habit tracking in this version.
- "Calendar days" in the habit grid are the user's local calendar days (not UTC), consistent with how the existing study streak heatmap already treats days.
- Each of the 4 themes defines both a light-mode and a dark-mode color set (mirroring the existing `--primary`/`--background`/etc. CSS variable pairs already in the codebase), so light/dark mode and color theme are independent choices that combine (4 themes × 2 modes = 8 total visual combinations).
- The habit grid is visually and functionally distinct from the existing SRS study-plan streak heatmap (features/study-plan) — no shared component or data between the two; habits are a separate concept from SRS review activity.
- No reminders/notifications for habits are in scope for this version.
- Habit names are short free text with a reasonable length limit; no icon/emoji picker or categorization in this version.
- The 4 seed themes' exact names/colors are a design decision made during planning/implementation, not dictated by this spec.
