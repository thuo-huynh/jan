# Feature Specification: Habit and Learning Companion

**Feature Branch**: `005-habit-learning-companion`

**Created**: 2026-08-30

**Status**: In progress

**Input**: Restructure JanGo from a general productivity and JLPT tracker into a focused personal habit and learning companion.

## Product Audit

### Current architecture

The application is a Next.js 14 App Router application with TypeScript, Tailwind CSS, Supabase Auth/Postgres/RLS, feature folders, and thin server-rendered routes. Learning data is currently split across vocabulary SRS, grammar SRS, reading passages and logs, listening logs, mock tests, mistakes, and study goals. Habit tracking is a separate, smaller domain. Kanban boards and task-related note links are a separate productivity product.

### KEEP

- Supabase authentication, RLS, feature-folder conventions, and the Vietnamese interface.
- Habit completion history and streak semantics.
- Vocabulary and grammar SRS, including user-owned study sets.
- Reading passages, questions, and per-user answer progress.
- Reading/listening logs, study goals, useful learning statistics, notes, and the existing theme-preference persistence.

### REMOVE FROM PRIMARY PRODUCT

- Boards/Kanban from navigation and the default landing experience.
- Task-oriented language, task-linked note controls, and task-oriented dashboard framing.
- Admin and reference-data surfaces from the everyday user navigation.

Existing data and routes remain available during migration. No existing table is dropped in this feature.

### REFACTOR

- Dashboard data into one server-side, bounded dashboard read model.
- Habit data loading, streak and consistency calculations into a domain service.
- Learning summaries into category-aware aggregates sourced from real records.
- Navigation around Dashboard, Habits, Learn, Library, Progress, and Settings.
- Tokens and reusable UI primitives around a single soft vintage-blue light theme, while preserving the current user preference mechanism.

### REBUILD

- The main app shell and dashboard around today's actions rather than analytics cards.
- The habits experience around daily completion and consistency.
- A library that presents existing vocabulary sets, grammar sets, reading sets, and learning logs as personal material collections.
- A focused study-mode shell that existing vocabulary, grammar, reading, and listening experiences can adopt incrementally.

## User Scenarios and Testing

### User Story 1 - Complete today's habits (Priority: P1)

As a learner, I can open the application and immediately see and complete today's habits so that maintaining consistency takes one action per habit.

**Why this priority**: Daily habit completion is the first purpose of the product and must be actionable above the fold.

**Independent Test**: Sign in with habits and prior completions, toggle a habit from the dashboard, reload, and confirm its state, daily count, and streak are preserved.

**Acceptance Scenarios**:

1. **Given** active habits, **When** the user opens the dashboard, **Then** each active habit shows its completion state and current streak.
2. **Given** an incomplete habit, **When** the user completes it, **Then** the UI updates immediately and the completion remains after reload.
3. **Given** no habits, **When** the user opens the dashboard or habits page, **Then** a useful empty state invites first-habit creation.

---

### User Story 2 - Resume meaningful learning (Priority: P1)

As a learner, I can see due review work and my recently used material so that I can resume learning without navigating through a collection of unrelated tools.

**Why this priority**: The product only becomes a learning companion when the next useful learning action is obvious.

**Independent Test**: Seed vocabulary/grammar reviews, reading passages, or logs; open the dashboard and confirm that each displayed count, link, and recent material is sourced from those records.

**Acceptance Scenarios**:

1. **Given** due SRS items, **When** the user opens the dashboard, **Then** a prominent Continue Learning action opens the review session.
2. **Given** existing study materials, **When** the user opens Library, **Then** materials can be filtered by Grammar, Vocabulary, Listening, or Reading and opened through their existing study surface.
3. **Given** no learning data, **When** the user opens Library, **Then** the empty state explains how to add a first material without inventing statistics.

---

### User Story 3 - Understand progress at a glance (Priority: P2)

As a learner, I can understand my real habit consistency and study activity without a dense analytics dashboard.

**Why this priority**: Progress supports motivation after today's concrete actions are clear.

**Independent Test**: Create known habit completions and dated learning records, then verify that dashboard and Progress totals only reflect those records and their intended time windows.

**Acceptance Scenarios**:

1. **Given** history exists, **When** the user opens Dashboard, **Then** weekly learning activity and habit consistency are lower-priority sections after today's actions.
2. **Given** learning data by category, **When** the user opens Progress, **Then** category metrics use real category-appropriate units.
3. **Given** a large history, **When** the user opens Dashboard, **Then** it does not need to transfer full history merely to show a current summary.

---

### User Story 4 - Use a coherent personal space (Priority: P2)

As a learner, I can move through a calm, consistent interface that feels like a personal study journal rather than work-management software.

**Why this priority**: Product focus must be expressed in navigation, terminology, visual hierarchy, and feedback.

**Independent Test**: Navigate all primary pages at desktop and mobile widths; confirm the main navigation contains only the defined product areas, controls have focus states, and task-management language is absent from primary flows.

## Edge Cases

- A user has no habits, no material, or only one category of learning data.
- A habit completion request fails after optimistic feedback; its prior state must be restored with a clear error.
- A user has global reference vocabulary/grammar but no personal sets.
- A user has historical data created before new material read models exist; all existing records remain visible and valid.
- A date boundary must be evaluated in the user's local calendar day, not by an accidental UTC rollover.

## Requirements

### Functional Requirements

- **FR-001**: The primary authenticated navigation MUST present Dashboard, Habits, Learn, Library, Progress, and Settings in a calm, compact structure.
- **FR-002**: The dashboard MUST render today’s habits and the next learning action before secondary progress visualizations.
- **FR-003**: Habit completion MUST persist using the existing completion history and update immediately when safe.
- **FR-004**: Dashboard habit metrics MUST include completed-today count, current streak, and meaningful weekly consistency from real records.
- **FR-005**: Dashboard learning metrics MUST use existing vocabulary, grammar, reading, listening, and review data rather than fabricated values.
- **FR-006**: Library MUST present existing user-owned vocabulary, grammar, and reading sets plus available learning categories without treating them as projects or folders.
- **FR-007**: The product MUST retain existing authentication, user data, RLS behaviour, learning routes, and theme-preference persistence.
- **FR-008**: Board/Kanban must not appear in primary navigation or be represented as a central product purpose.
- **FR-009**: Core dashboard data MUST be fetched server-side in bounded, dashboard-specific queries and avoid duplicating calculations between routes.
- **FR-010**: The primary light theme MUST use accessible soft vintage-blue and warm-paper tokens with consistent forms, buttons, cards, empty states, and responsive layouts.
- **FR-011**: Study experiences MUST retain category-specific content and interactions while moving toward a shared focused study shell.
- **FR-012**: Progress MUST prioritize understandable weekly/monthly consistency and category metrics over decorative charts.

### Key Entities

- **Habit**: A user-owned daily practice with a creation date and completion history.
- **Habit completion**: The record that proves one habit was completed on a local calendar date.
- **Learning material**: A library-facing view over an existing vocabulary set, grammar set, reading set, or learning category collection.
- **Learning activity**: A dated review, reading, listening, or question-progress event used for bounded summaries.
- **Study progress**: Per-user mastery or completion state connected to a vocabulary item, grammar point, or reading question.

## Success Criteria

### Measurable Outcomes

- **SC-001**: A signed-in user with existing habits can identify and complete today’s next habit from the first dashboard viewport without opening another page.
- **SC-002**: A signed-in user with due review items can reach the review session from the dashboard in one interaction.
- **SC-003**: All dashboard totals shown for habits and learning can be traced to persisted records and are never generated from placeholder data.
- **SC-004**: Primary navigation contains no more than six everyday destinations and excludes generic task-management surfaces.
- **SC-005**: The primary dashboard and habits flows remain usable at 320px width and desktop width with keyboard focus visible on all interactive controls.

## Assumptions

- The application remains a single-user, Vietnamese-language personal product.
- Existing learning sets and logs are the first implementation of Library; arbitrary file upload/storage is not introduced until a supported ingestion format and storage policy are specified.
- Dark mode remains supported through the existing preference mechanism, but the light vintage-blue theme is the primary design target.
- Existing Kanban data remains preserved and its routes are not destructively removed in this feature.
