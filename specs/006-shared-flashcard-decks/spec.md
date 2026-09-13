# Feature Specification: Shared Flashcard Decks

**Feature Branch**: `006-shared-flashcard-decks`

**Created**: 2026-09-13

**Status**: Draft

**Input**: User description: "Redesign Flashcards after the supplied references. Admins curate shared vocabulary collections that every signed-in user can browse and study."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Browse and study a shared deck (Priority: P1)

As a learner, I can discover published flashcard decks by JLPT level, topic, or a search term and start studying one deck so that I can focus on the vocabulary relevant to my current goal.

**Why this priority**: A curated choice of small, meaningful decks is the central improvement over the current flat global vocabulary list.

**Independent Test**: With published decks containing global vocabulary, a signed-in learner filters the catalog, selects a matching deck, and studies only its cards.

**Acceptance Scenarios**:

1. **Given** one or more published decks, **When** a learner opens Flashcards, **Then** they see a searchable, filterable catalog with each deck's title, description, JLPT level, labels, card count, and a clear study action.
2. **Given** a learner selects a published deck, **When** they start studying, **Then** the flashcard session contains only vocabulary assigned to that deck.
3. **Given** no published decks match the active filters, **When** the learner views the catalog, **Then** they see a clear empty state and can clear the filters.

---

### User Story 2 - Understand personal flashcard work (Priority: P1)

As a learner, I can see my vocabulary total and items due for review before choosing a deck so that I know whether to review or learn something new.

**Why this priority**: The reference design prioritizes today's study decision over a generic list of cards.

**Independent Test**: With known personal vocabulary and review progress, a learner opens Flashcards and sees totals that match their own data, not another user's data.

**Acceptance Scenarios**:

1. **Given** a learner has vocabulary and due reviews, **When** they open Flashcards, **Then** the summary shows their own total available cards and due-review count with links to the appropriate study actions.
2. **Given** a learner has no custom vocabulary or review history, **When** they open Flashcards, **Then** the summary remains useful and explains how to browse a shared deck.
3. **Given** a learner has previous review activity for words in a shared deck, **When** they view that deck, **Then** its progress reflects only that learner's own review state.

---

### User Story 3 - Curate shared flashcard decks (Priority: P1)

As an administrator, I can create, edit, publish, unpublish, and delete shared flashcard decks, then assign shared vocabulary entries to them, so that learners receive a maintained catalog of topic-based study material.

**Why this priority**: The learner catalog has no useful content unless an administrator can curate it without touching user-owned vocabulary.

**Independent Test**: An administrator creates a deck, assigns existing shared vocabulary, publishes it, and confirms a regular learner can find and study it but cannot change it.

**Acceptance Scenarios**:

1. **Given** an administrator is managing reference data, **When** they create a deck with a name, description, JLPT level, and optional labels, **Then** it is saved as an unpublished draft until they publish it.
2. **Given** a draft or published deck, **When** the administrator assigns or removes shared vocabulary entries, **Then** its card count updates and no user-owned vocabulary can be assigned.
3. **Given** a deck is published, **When** a regular learner browses Flashcards, **Then** the deck is available to them; unpublished decks are not visible to regular learners.
4. **Given** a regular learner, **When** they attempt to create, edit, publish, or delete a shared deck, **Then** the action is denied.

---

### User Story 4 - Keep personal decks separate (Priority: P2)

As a learner, I can still manage my own vocabulary and personal sets separately from shared decks so that curated content never overwrites my private study material.

**Why this priority**: Existing custom vocabulary and named sets are valuable working data and must remain intact.

**Independent Test**: With both a personal set and a shared deck, the learner can study either source and confirms that changing personal content does not change the shared catalog.

**Acceptance Scenarios**:

1. **Given** a learner has personal vocabulary sets, **When** they use the vocabulary management page, **Then** all existing add, edit, import, and delete actions behave as before.
2. **Given** shared decks exist, **When** a learner browses their personal sets, **Then** the shared decks are visibly identified as curated content rather than editable personal sets.

### Edge Cases

- A published deck has no assigned vocabulary: learners do not see it in the study catalog until it contains at least one card.
- An administrator removes a vocabulary item from a published deck: the item is no longer in future deck study sessions, while any existing personal review history for that word remains private.
- An administrator unpublishes a deck while a learner is browsing: it no longer appears in a fresh catalog view and cannot start a new session.
- A learner filters by a label or JLPT level that has no matching published decks: the UI provides a reset action instead of a blank page.
- A learner has never reviewed any cards in a shared deck: deck progress starts at zero without creating unnecessary personal records.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST allow administrators to curate named shared flashcard decks from existing shared vocabulary entries.
- **FR-002**: A shared deck MUST have a title, optional description, JLPT level, optional labels, a publication state, and an ordered collection of vocabulary entries.
- **FR-003**: Only shared/global vocabulary may belong to a shared deck; a learner's private vocabulary must never become visible to another learner through a shared deck.
- **FR-004**: Only administrators may create, edit, publish, unpublish, reorder, or delete shared decks and their membership.
- **FR-005**: Any authenticated learner MUST be able to read published decks and their assigned vocabulary; unpublished decks MUST be unavailable to regular learners.
- **FR-006**: Flashcards MUST provide a landing experience with the learner's card total, due-review count, direct review access, a shared-deck catalog, search, and filters for JLPT level and labels.
- **FR-007**: Starting a shared deck MUST open a flashcard session limited to the deck's assigned vocabulary entries.
- **FR-008**: Progress shown for a shared deck MUST be calculated from the current learner's existing vocabulary-review history and must not reveal another learner's data.
- **FR-009**: The existing personal vocabulary, custom sets, imports, and free-flip flashcard interactions MUST remain available and unchanged in behavior.
- **FR-010**: New learner-facing copy, empty states, actions, and accessible labels MUST be in Vietnamese and work at mobile and desktop widths.

### Key Entities *(include if feature involves data)*

- **Shared flashcard deck**: An administrator-curated, publishable learning collection with learner-facing metadata and an ordered list of shared vocabulary.
- **Deck vocabulary membership**: The assignment and order of one shared vocabulary entry within a shared flashcard deck.
- **Vocabulary review progress**: A learner-private schedule and mastery record for one vocabulary entry; it is reused when showing deck progress and is never owned by the deck.
- **Personal vocabulary set**: A learner-owned collection that remains separate from all shared flashcard decks.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A signed-in learner can find and start a published deck in no more than three interactions from the Flashcards landing screen.
- **SC-002**: A published deck's displayed card count matches the number of vocabulary cards available in its study session.
- **SC-003**: A learner's displayed deck progress changes only with that learner's review history and never with another learner's activity.
- **SC-004**: An administrator can publish a new shared deck from existing global vocabulary without creating or editing any user-owned vocabulary.
- **SC-005**: The catalog, filters, and primary study action remain usable with keyboard navigation at 320px and desktop widths.

## Assumptions

- Shared decks are curated by application administrators, not community-authored or user-shareable in this release.
- Learners start a shared deck directly; no separate "save" or duplicate-to-library step is required.
- Existing per-word review progress is the source of truth for a learner's deck progress; free-flip browsing itself does not create review records.
- The current global vocabulary catalog remains the canonical source of cards; this feature groups those entries and does not duplicate their text.
- The supplied screenshots are layout and information-hierarchy references. JanGo's existing theme tokens, typography, accessibility requirements, and Vietnamese voice remain binding.
