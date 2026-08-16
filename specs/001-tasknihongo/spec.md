# Feature Specification: TaskNihongo — Task Management + JLPT N2 Japanese Learning

**Feature Branch**: `001-tasknihongo`

**Created**: 2026-08-15
**Updated**: 2026-08-15 — expanded Japanese learning tracker to JLPT N2-focused study system (grammar points, confusable pairs, vocab/kanji SRS, reading/listening logs, mock tests, mistake notebook, study plan/streak)

**Status**: Draft

**Input**: User description: "Build a web app called TaskNihongo that combines Kanban-style task management with a personal Japanese-learning tracker and freeform notes. The learning tracker is focused on JLPT N2 review for a user who is N3-certified and targeting N2: a built-in N2 grammar point database with per-user mastery status and confusable-pair comparisons, N2 vocab/kanji SRS decks blended with user-added words, reading and listening practice logs, a mock-test score tracker with countdown, a mistake notebook feeding back into SRS, and a study plan with streak heatmap. Plus a Kanban board and freeform notes. Two roles: user and admin, with admin moderation/stats and server-side role gating."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Manage tasks on a Kanban board (Priority: P1)

A signed-in user creates a board, adds tasks with details (title, description, tags, due date, checklist), and moves tasks across columns (Todo → In Progress → In Review → Done) as work progresses, so they can track and organize their personal workload.

**Why this priority**: Core task-management value proposition and the most frequently used surface of the app. Without it there is no MVP.

**Independent Test**: Can be fully tested by creating a board, adding a task with a checklist, dragging it between columns, and filtering by tag/status — delivers standalone value as a task tracker even with no Japanese-learning features present.

**Acceptance Scenarios**:

1. **Given** a signed-in user with no boards, **When** they create a new board, **Then** it is created with the four default columns (Todo, In Progress, In Review, Done).
2. **Given** a board with tasks in "Todo", **When** the user drags a task into "In Progress", **Then** the task's column updates immediately and persists after a page reload.
3. **Given** a task with a checklist of 4 items where 2 are complete, **When** the user views the task, **Then** progress is shown as 50%.
4. **Given** multiple tasks with different tags and due dates, **When** the user filters by a tag, **Then** only tasks with that tag are shown.
5. **Given** a user customizes a board's columns (rename, add, remove, reorder), **When** they revisit the board, **Then** the customized columns persist.

---

### User Story 2 - Track N2 grammar point mastery and disambiguate confusables (Priority: P1)

A signed-in user (already N3-certified) browses a built-in database of ~200 N2 grammar points, marks each as chưa học / đang ôn / đã thuộc, attaches personal notes/mnemonics, and — for the pairs that are notoriously easy to mix up — opens a side-by-side comparison view to internalize the distinction, optionally filtering the list to hide anything already covered at N3.

**Why this priority**: This is the top pain point the user explicitly called out for N2 study and a distinct value pillar from generic vocab SRS — ranked P1 alongside Kanban because it's a primary reason for using the app.

**Independent Test**: Can be fully tested by opening the grammar list, changing a point's status, adding a personal note, opening a confusable-pair comparison, and applying the N3-level-diff filter — independent of vocab/reading/listening features.

**Acceptance Scenarios**:

1. **Given** the seeded N2 grammar database, **When** the user opens the grammar tracker, **Then** they see each point's pattern (文型), meaning, connection form (接続), formality/nuance, example sentence(s), and JLPT frequency tag.
2. **Given** a grammar point marked "chưa học", **When** the user changes its status to "đang ôn", **Then** the new status persists and is reflected in the mastery progress count (FR referenced below).
3. **Given** two grammar points known to be confusable (e.g. 〜として vs 〜にとって), **When** the user opens the comparison view for that pair, **Then** both points are shown side-by-side with a comparison note explaining the distinction.
4. **Given** the user enables the "hide N3-level material" filter, **When** the list refreshes, **Then** grammar points already covered at N3 are excluded from view.
5. **Given** a grammar point, **When** the user adds a personal mnemonic/note, **Then** it is saved and shown only to that user (not visible to other users, since the base point is shared reference data).

---

### User Story 3 - Review N2 vocabulary and kanji via spaced repetition (Priority: P1)

A signed-in user reviews due items from a blended deck combining the preloaded N2 word list (~6,000 words) and kanji list (~1,000 kanji) with their own custom-added vocabulary, in either reading→meaning or kanji-recognition/recall direction, with the option to narrow the queue to previously-weak items only.

**Why this priority**: Alongside grammar mastery, this is the other core recurring daily-use surface for N2 study — ranked P1.

**Independent Test**: Can be fully tested by adding a custom vocab word, confirming it appears blended into the same due queue as preloaded items, completing a review in both directions, and switching to "weak items only" mode — independent of grammar/reading/listening features.

**Acceptance Scenarios**:

1. **Given** the preloaded N2 vocab/kanji lists and a user's custom-added word, **When** the user opens the review queue, **Then** due items from both the preloaded and custom sets appear together, distinguishable by tag (N2 vs custom) but reviewed in one unified queue.
2. **Given** a kanji item, **When** the user selects "recognition" mode, **Then** they are prompted with the kanji and graded on reading/meaning recall; **When** they select "writing recall" mode, **Then** they are prompted with the reading/meaning and asked to recall the kanji form.
3. **Given** a review is graded, **When** the result is submitted, **Then** the item's interval/ease and fail count update per the SRS algorithm (interval grows on success, shrinks/resets and fail count increments on failure).
4. **Given** items with high fail count or low ease, **When** the user enables "review weak items only," **Then** the queue is restricted to that subset, sorted by weakest first.
5. **Given** a user adds their own vocab entry, **When** they tag it, **Then** it is stored as their custom entry (not visible to other users) and blended into future review sessions.

---

### User Story 4 - Log reading and listening practice (Priority: P2)

A signed-in user logs each 読解 (reading) or 聴解 (listening) practice session — source, passage type (for reading), duration, self-rated comprehension — and can push unknown vocab/grammar encountered during the session straight into the SRS queue or notes, then sees a dashboard breakdown of performance by passage type.

**Why this priority**: Valuable structured logging that feeds the mistake/SRS loop, but the app remains useful for grammar/vocab study without it — ranked below the two P1 study pillars.

**Independent Test**: Can be fully tested by logging a reading session with a passage type and comprehension score, logging a listening session, attaching an unknown word from the session directly to the SRS queue, and viewing the by-passage-type breakdown — independent of mock tests or the mistake notebook.

**Acceptance Scenarios**:

1. **Given** a completed reading passage, **When** the user logs it with source, passage type (随筆/評論/案内/etc.), time spent, and a self-rated comprehension score, **Then** the entry appears in their reading log history.
2. **Given** a reading log entry, **When** the user attaches an unknown word encountered in the passage, **Then** it is added to the SRS vocab queue (as a custom entry) linked back to that log entry.
3. **Given** several reading log entries across passage types, **When** the user views the dashboard, **Then** average comprehension score is broken down per passage type, surfacing the weakest type.
4. **Given** a completed listening/shadowing session, **When** the user logs source, duration, self-rated comprehension, and notes, **Then** the entry appears in their listening log history.

---

### User Story 5 - Track mock test scores and exam countdown (Priority: P2)

A signed-in user records practice/past-paper test results broken down by section (文字・語彙・文法, 読解, 聴解), sees a score trend chart over time, and sees a "days remaining" countdown to their exam date on the dashboard.

**Why this priority**: High motivational and planning value close to exam time, but not needed for day-to-day study, so ranked P2.

**Independent Test**: Can be fully tested by recording two mock test results on different dates and confirming the trend chart reflects both, and by setting an exam date and confirming the countdown widget shows the correct day count — independent of other learning features.

**Acceptance Scenarios**:

1. **Given** a completed mock test, **When** the user records section scores (vocab/grammar, reading, listening) and a total, **Then** the result is saved with the test date.
2. **Given** two or more recorded mock test results, **When** the user views the score trend chart, **Then** results are plotted in chronological order per section.
3. **Given** an exam date is set, **When** the user views the dashboard, **Then** a "days remaining" widget shows the correct countdown.

---

### User Story 6 - Maintain a mistake notebook that feeds spaced repetition (Priority: P2)

A signed-in user reviews a central log of mistakes (pulled from mock test entries or added manually), and with one click sends a mistake into the SRS queue so it gets spaced-repetition follow-up instead of being forgotten; resolved mistakes can be marked as such.

**Why this priority**: A high-leverage feedback loop that meaningfully improves retention of known weak points, but depends on other logging features already existing to have content to draw from — ranked P2.

**Independent Test**: Can be fully tested by manually adding a mistake entry, linking it to a vocab or grammar item, one-click adding it to the SRS queue, and marking it resolved — independent of whether it originated from a mock test.

**Acceptance Scenarios**:

1. **Given** a manually entered mistake, **When** the user saves it, **Then** it appears in the mistake notebook with its source marked "manual".
2. **Given** a mistake linked to a specific vocab or grammar item, **When** the user clicks "add to SRS queue," **Then** that item is scheduled for review (or its existing schedule is nudged sooner) and this is reflected in the review queue.
3. **Given** a resolved mistake, **When** the user marks it resolved, **Then** it is visually distinguished from open mistakes but remains in the log for reference.

---

### User Story 7 - Follow a daily study plan with streak tracking (Priority: P2)

A signed-in user sets a daily goal (e.g., N grammar points reviewed + M vocab reviews), and sees a GitHub-style contribution heatmap of study activity plus a daily/weekly study-time chart to stay motivated and consistent.

**Why this priority**: Reinforces consistent use of the P1 study features and drives retention, but is a layer on top of activity that must already exist — ranked P2.

**Independent Test**: Can be fully tested by setting a daily goal, performing enough grammar/vocab reviews in a day to meet it, and confirming the heatmap cell for that day reflects activity and the goal-met state — independent of which specific study feature generated the activity.

**Acceptance Scenarios**:

1. **Given** a user sets a daily goal of N grammar reviews + M vocab reviews, **When** they meet that goal on a given day, **Then** the day is marked as goal-met on the dashboard.
2. **Given** a history of study activity across many days, **When** the user views the heatmap, **Then** each day's cell intensity reflects that day's activity volume, matching a GitHub-style contribution graph.
3. **Given** a day with zero qualifying activity, **When** the user views their streak, **Then** the streak resets, consistent with User Story 3's SRS streak behavior.

---

### User Story 8 - View consolidated progress dashboard (Priority: P2)

A signed-in user opens a single dashboard summarizing grammar points mastered/total, vocab & kanji learned, review accuracy, current streak, and a weak-area summary indicating which grammar points, vocab, or reading/listening type needs the most work.

**Why this priority**: Ties together the outputs of Stories 2–7 into one actionable view; valuable but derivative of data those stories already produce, so it's sequenced after them.

**Independent Test**: Can be fully tested with seeded grammar/vocab/reading/listening/mock-test activity and confirming each dashboard figure matches the underlying data — independent of which specific study surface produced the activity.

**Acceptance Scenarios**:

1. **Given** grammar points with mixed statuses, **When** the user views the dashboard, **Then** it shows "mastered / total" using the đã thuộc count over the full grammar database size.
2. **Given** review history across vocab and kanji, **When** the user views the dashboard, **Then** it shows counts learned, review accuracy, and current streak consistent with Stories 3 and 7.
3. **Given** activity data across grammar, vocab, reading, and listening, **When** the user views the weak-area summary, **Then** it surfaces the lowest-performing area(s) (e.g., "reading: 評論 passages" or "grammar: N2 confusables") rather than a flat list of everything.

---

### User Story 9 - Capture and organize freeform notes (Priority: P3)

A signed-in user writes a markdown note, organizes it into a folder with tags, optionally links it to an existing task or vocabulary/grammar entry, and later finds it again via full-text search or by pinning it as a favorite.

**Why this priority**: Extends the app's value as a general knowledge base and ties the other pillars together, but the app is still useful without it — ranked lowest of the user-facing pillars.

**Independent Test**: Can be fully tested by creating a note with markdown content, assigning it to a folder/tags, pinning it, linking it to a task, and finding it via search — independent of Kanban or study state beyond the optional link target existing.

**Acceptance Scenarios**:

1. **Given** a user writes a note with markdown syntax, **When** they view the note, **Then** it renders formatted (headings, lists, bold/italic, code).
2. **Given** several notes across folders and tags, **When** the user searches a keyword, **Then** matching notes (by title or body) are returned regardless of folder.
3. **Given** a note, **When** the user pins it, **Then** it appears in a "Pinned" view ahead of unpinned notes.
4. **Given** a note linked to a task, **When** the user views that task, **Then** the linked note is discoverable from the task, and vice versa.
5. **Given** a linked task, vocab, or grammar entry is deleted, **When** the user views the note, **Then** the note itself is not deleted and the broken link is handled gracefully (e.g., shown as removed).

---

### User Story 10 - Admin moderates users and content (Priority: P3)

An authenticated admin opens the role-gated admin dashboard to search users, review account status, suspend or delete accounts, inspect and remove user-generated content that violates policy, view aggregate usage stats, and manage the shared/global reference data (JLPT vocab, kanji, and N2 grammar database) separately from user-authored entries.

**Why this priority**: Necessary for platform health and safety once real users exist, but not required for a single early adopter to get value from the core study/task features — sequenced last.

**Independent Test**: Can be fully tested with a seeded admin account and seeded regular-user data: log in as admin, search/find a user, view their content, suspend the account, edit a global grammar/vocab entry, and confirm the changes take effect — independent of the specific task/vocab/note content involved.

**Acceptance Scenarios**:

1. **Given** a non-admin user, **When** they navigate directly to an admin route, **Then** access is denied regardless of client-side navigation attempts.
2. **Given** an admin, **When** they search users by name/email, **Then** matching users are listed with signup date, last-active date, and status.
3. **Given** an admin views a user's account, **When** they suspend it, **Then** that user can no longer sign in or use the app until reinstated.
4. **Given** an admin views a user's account, **When** they delete it, **Then** the user's account and associated content are removed (or scheduled for removal) per data-handling policy, and this action requires confirmation.
5. **Given** an admin browses reported or arbitrary user content (tasks, notes, custom vocab/grammar entries), **When** they open an entry, **Then** they can view its full content and remove it if it violates policy.
6. **Given** an admin opens the usage stats view, **When** the dashboard loads, **Then** it shows total users, active users in the last 7 and 30 days, and total tasks/notes/vocab created.
7. **Given** an admin adds or edits an entry in the shared/global reference data (vocab, kanji, or N2 grammar point/confusable pair), **When** a regular user browses or reviews it, **Then** the updated global entry is reflected, distinct from that user's own custom entries and personal notes.

---

### Edge Cases

- What happens when a user has zero boards/tasks/grammar-progress/vocab/notes (empty states for each core surface)?
- How does the system handle two devices/tabs editing the same board concurrently (optimistic update conflict)?
- What happens when a user's SRS review queue (vocab/kanji or grammar) has zero cards due versus a large backlog of overdue cards after an absence?
- How does drag-and-drop reordering behave on touch/mobile devices where native drag gestures conflict with scrolling?
- What happens when a task, note, vocab, or grammar entry is deleted while it is referenced by a link from another entity (note link, mistake-notebook link, reading-log link)?
- How does the system respond when an admin attempts to delete their own account or the last remaining admin account?
- What happens when a suspended user's session is already active (mid-session revocation)?
- How does full-text search behave with very short queries, non-Latin (Japanese) characters, or no matches?
- What happens when a user attempts to access or modify another user's task/note/vocab/grammar-status/log entry by guessing an ID (must be blocked server-side)?
- How does the system handle import/reference of a global vocab or grammar entry that the user has already customized locally (conflict/duplicate handling)?
- What happens when "review weak items only" mode has zero qualifying items (no weak items yet)?
- What happens when a mistake-notebook entry is linked to a vocab/grammar item that gets deleted or was never linked (manual entry with no link)?
- How does the exam-countdown widget behave once the exam date has passed (no exam date set, or date in the past)?
- What happens when a user marks a confusable-pair comparison's constituent grammar point mastered but the other point in the pair is still "chưa học" — does the pair itself have a status, or only its constituent points?
- How does the N3-level-diff filter behave for grammar points that have no recorded N3-overlap flag (treat as N2-only by default, or require the flag be explicitly set)?

## Requirements *(mandatory)*

### Functional Requirements

**Authentication & Roles**

- **FR-001**: System MUST require authentication for all task, learning-tracker, and notes features.
- **FR-002**: System MUST support two roles, `user` and `admin`, assigned per account.
- **FR-003**: System MUST protect all admin routes and admin actions with a server-side role check that cannot be bypassed by client-side manipulation.
- **FR-004**: System MUST prevent any user from reading or modifying another user's tasks, notes, grammar-status/personal-notes, custom vocab, or logs, enforced server-side.

**Task Management (Kanban)**

- **FR-005**: Users MUST be able to create boards with a customizable set of columns, defaulting to Todo, In Progress, In Review, Done.
- **FR-006**: Users MUST be able to rename, add, remove, and reorder columns on a board they own.
- **FR-007**: Users MUST be able to create tasks with title, description, tags/labels, due date, progress percentage, a checklist of subtasks, an attachment count, and an assignee field (single assignee; multi-assignee is out of scope for v1).
- **FR-008**: Users MUST be able to move tasks between columns and reorder tasks within a column via drag-and-drop.
- **FR-009**: Task progress percentage MUST be derivable from checklist completion when a checklist exists, and independently settable when it does not.
- **FR-010**: Users MUST be able to filter and search tasks by tag, due date, and column/status.
- **FR-011**: Board and task state changes MUST be reflected in the UI immediately (optimistically), even if full real-time multi-client sync is not implemented in v1.

**N2 Grammar Point Tracker**

- **FR-012**: System MUST provide a built-in reference database of approximately 200 N2 grammar points, each with pattern (文型), meaning, connection form (接続), formality/nuance notes, at least one example sentence, and a JLPT frequency tag.
- **FR-013**: System MUST track a per-user status (chưa học / đang ôn / đã thuộc) for every grammar point, independent of the shared reference data.
- **FR-014**: Users MUST be able to attach personal notes, mnemonics, and additional example sentences to any grammar point, visible only to that user.
- **FR-015**: System MUST provide side-by-side confusable-pair comparison views for a curated set of commonly-mixed-up N2 grammar pairs, each pair carrying a comparison note explaining the distinction.
- **FR-016**: Users MUST be able to filter the grammar list to hide points already covered at N3 (level-diff view).

**N2 Vocabulary & Kanji SRS**

- **FR-017**: System MUST maintain a preloaded N2 vocabulary list (~6,000 words) and a preloaded N2 kanji list (~1,000 kanji), each distinguishable as global/shared reference data separate from user-added entries.
- **FR-018**: Users MUST be able to add their own custom vocabulary entries, tagged (e.g., N2/custom), which are blended into the same review queue as preloaded items.
- **FR-019**: System MUST maintain a spaced-repetition schedule (interval, ease, fail count) per vocab/kanji item per user, updating it after each review based on the reviewer's response.
- **FR-020**: System MUST support review in both directions for applicable items: reading→meaning, and kanji recognition/writing recall.
- **FR-021**: Users MUST be able to restrict the review queue to "weak items only" (items with low ease and/or high fail count).

**Reading & Listening Practice Logs**

- **FR-022**: Users MUST be able to log a reading-practice session with source, passage type, time spent, and a self-rated comprehension score.
- **FR-023**: Users MUST be able to attach unknown vocabulary or grammar encountered in a reading session directly to the SRS queue or to a note, linked back to the originating log entry.
- **FR-024**: System MUST present a dashboard breakdown of reading comprehension performance by passage type, surfacing the weakest type.
- **FR-025**: Users MUST be able to log a listening/shadowing-practice session with source, duration, self-rated comprehension score, and notes.

**Mock Test Tracking**

- **FR-026**: Users MUST be able to record a practice/past-paper test result with per-section scores (文字・語彙・文法, 読解, 聴解) and a total, dated.
- **FR-027**: System MUST present a score trend chart of recorded mock test results over time, per section.
- **FR-028**: Users MUST be able to set an exam date, and the dashboard MUST show a "days remaining" countdown derived from it.

**Mistake Notebook**

- **FR-029**: Users MUST be able to record a mistake either manually or (when available) pulled from a mock test result, with source marked accordingly.
- **FR-030**: Users MUST be able to link a mistake-notebook entry to a specific vocab or grammar item.
- **FR-031**: Users MUST be able to add a mistake-notebook entry's linked item to the SRS review queue with a single action.
- **FR-032**: Users MUST be able to mark a mistake-notebook entry resolved, and resolved entries MUST remain visible in the log (not deleted) but visually distinguished from open ones.

**Study Plan & Streak**

- **FR-033**: Users MUST be able to set a daily study goal expressed as a count of grammar-point reviews plus vocab/kanji reviews.
- **FR-034**: System MUST track daily study activity sufficient to determine whether the daily goal was met, and present it as a GitHub-style contribution heatmap.
- **FR-035**: System MUST present a daily/weekly study-time chart.
- **FR-036**: System MUST track and display a current study streak, consistent across grammar and vocab/kanji review activity.

**Progress Dashboard**

- **FR-037**: System MUST present a consolidated dashboard showing: grammar points mastered vs. total, vocab & kanji items learned, review accuracy, current streak, and a weak-area summary identifying the lowest-performing grammar/vocab/reading/listening areas.

**Freeform Notes**

- **FR-038**: Users MUST be able to create notes with markdown-formatted rich text.
- **FR-039**: Users MUST be able to organize notes using folders and tags.
- **FR-040**: Users MUST be able to pin notes as favorites and view pinned notes separately.
- **FR-041**: Users MUST be able to perform full-text search across their notes (title and body).
- **FR-042**: Users MUST be able to optionally link a note to one task and/or one vocabulary or grammar entry.
- **FR-043**: Deleting a task, vocabulary entry, or grammar point that is linked from a note MUST NOT delete the note; the link MUST be handled gracefully (e.g., marked as no longer available).

**Admin**

- **FR-044**: Admins MUST be able to list and search all user accounts, viewing signup date, last-active date, and account status.
- **FR-045**: Admins MUST be able to suspend and delete user accounts, with deletion requiring explicit confirmation.
- **FR-046**: Admins MUST be able to view and remove user-generated content (tasks, notes, custom vocab/grammar entries, logs) for moderation purposes.
- **FR-047**: Admins MUST be able to view aggregate usage statistics: total users, active users in the last 7 and 30 days, and total tasks/notes/vocab created.
- **FR-048**: Admins MUST be able to manage the shared/global reference data (vocab, kanji, N2 grammar points, and confusable pairs) independently of any individual user's custom entries or personal notes.
- **FR-049**: A suspended user MUST be prevented from authenticating or using any user-facing feature until reinstated.

**Cross-cutting**

- **FR-050**: The UI MUST be usable on both desktop and mobile viewport sizes across all core features (Kanban board, grammar tracker, review queue, logs, dashboard, notes).

*Assumption note: reviewer response granularity for vocab/kanji/grammar SRS (e.g., simple correct/incorrect vs. a 4-point again/hard/good/easy scale) is left as an implementation detail of the SM-2-style algorithm referenced in FR-019, as long as interval-growth-on-success / reset-and-fail-count-increment-on-failure behavior in the Acceptance Scenarios holds.*

### Key Entities *(include if feature involves data)*

- **User Account**: A person using the app; has an email/credential, a role (`user` or `admin`), account status (active/suspended), signup date, and last-active timestamp.
- **Board / Column / Task / Checklist Item**: Kanban entities as previously defined — a board owns ordered columns, columns hold ordered tasks, tasks optionally hold checklist items contributing to progress %.
- **Vocab/Kanji Entry**: A word or kanji character; has reading, meaning, example, JLPT level, an "is kanji" flag, and per-user SRS scheduling state (due date, interval, ease, fail count). May be a global/shared reference entry or a user's own custom entry.
- **Grammar Point**: One of the ~200 N2 reference grammar items; has pattern, meaning, connection form, formality/nuance, example sentence(s), frequency tag, and an N3-overlap flag (for the level-diff filter). Per-user status and personal notes are tracked separately from the shared point itself.
- **Confusable Pair**: A curated link between exactly two grammar points, carrying a comparison note explaining how to tell them apart.
- **Reading Log Entry**: A record of one reading-practice session; has source, passage type, duration, self-rated comprehension score, notes, and optional links to vocab/grammar items or notes discovered during the session.
- **Listening Log Entry**: A record of one listening/shadowing session; has source, duration, self-rated comprehension score, and notes.
- **Mock Test Result**: A dated record of practice-test scores per section (vocab/grammar, reading, listening) plus a total.
- **Mistake Notebook Entry**: A logged mistake; has a source (mock test or manual), content, optional links to a vocab or grammar item, and a resolved flag.
- **Review Log**: A record of a single SRS review attempt against a vocab/kanji item or a grammar point; has the reviewed item, timestamp, and result, used to compute accuracy, streaks, study time, and the daily-goal/heatmap data.
- **Study Goal**: A user's configured daily target (grammar reviews + vocab/kanji reviews) used to evaluate goal-met days for the streak heatmap.
- **Note / Folder**: A freeform markdown document owned by a user, organized into folders/tags, optionally linked to a task and/or a vocabulary/grammar entry.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A new user can create a board and their first task in under 2 minutes from first sign-in.
- **SC-002**: A user can complete a full vocab/kanji review session (10 items) in under 3 minutes.
- **SC-003**: 90% of drag-and-drop task moves are reflected in the UI within 200ms of the user releasing the task (perceived responsiveness, not a backend metric).
- **SC-004**: Users can find a specific note via search in under 10 seconds for a library of up to 500 notes.
- **SC-005**: An admin can locate a specific user account and view their content within 30 seconds of opening the admin dashboard.
- **SC-006**: 95% of users who complete at least one review (vocab/kanji or grammar) return to review again within 3 days (streak-driven retention signal).
- **SC-007**: Zero cross-user data leakage: in security testing, 100% of attempts by one user to access another user's tasks, notes, vocab, grammar status, or logs via direct ID access are rejected.
- **SC-008**: The application is fully usable (all core actions completable) on a mobile viewport (375px width) without horizontal scrolling or inaccessible controls.
- **SC-009**: A user can look up a specific confusable-grammar comparison (e.g., 〜として vs 〜にとって) in under 15 seconds from the grammar tracker.
- **SC-010**: A user can log a completed reading or listening session in under 1 minute.
- **SC-011**: The dashboard's weak-area summary correctly identifies the lowest-scoring passage type or grammar category for a seeded test account with intentionally skewed performance data, in a manual verification pass.

## Assumptions

- This is a single-user-per-account app for v1; the "assignee" field on tasks is captured for forward compatibility but only ever holds the task owner in v1 (no multi-user board collaboration, per stated out-of-scope).
- "Real-time updates" for the Kanban board means the acting user's own client updates optimistically; propagating changes to other simultaneously-connected clients/tabs in real time is deferred past v1 (explicitly acceptable per the source description).
- The spaced-repetition algorithm for vocab/kanji and grammar reviews follows a simplified SM-2-style approach (interval grows on success, resets/fail-count increments on failure); exact ease-factor tuning is an implementation detail.
- "Attachments" on tasks are represented by a count in v1; actual file upload/storage UX is an implementation concern, not detailed here beyond the count field.
- Account deletion by an admin follows a standard data-removal practice (immediate or soft-delete-then-purge); exact retention window is an implementation/legal detail.
- JLPT levels referenced are the standard five: N5 (easiest) through N1 (most advanced); this feature's learning content is scoped to N2, with an N3-overlap flag used for the level-diff filter rather than full N3 content.
- "Active user" for the 7/30-day admin stats means a user with at least one authenticated session or content action in that window.
- The ~200 N2 grammar points, ~6,000 N2 vocab words, and ~1,000 N2 kanji are treated as fixed reference-content targets to seed; the exact source/licensing of that reference content is a content-sourcing task outside this spec's functional scope.
- The confusable-pair list is a curated subset of the full grammar database (not all 200 points participate in a pair); curation of which pairs to include is a content task, not a per-spec requirement beyond FR-015's existence.
- "Weak items" for SRS queue filtering is defined operationally as items below an ease threshold and/or above a fail-count threshold; exact thresholds are an implementation detail, not specified here.
- Mock test section names (文字・語彙・文法, 読解, 聴解) map 1:1 to the JLPT's own section structure; no additional custom sections are required for v1.
