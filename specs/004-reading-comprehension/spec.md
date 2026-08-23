# Feature Specification: Reading Comprehension Passage Bank

**Feature Branch**: `004-reading-comprehension`

**Created**: 2026-08-23

**Status**: Draft

**Input**: User description: "Add a Reading Comprehension Passage Bank to the existing Reading
feature, mirroring the Grammar feature's HTML-import + manual-creation + set-grouping pattern.
Bulk HTML import of personal study-doc passages (title, passage text with inline vocab-term
annotations, one-or-more multiple-choice questions each with an explanation, a translation, a
reading-strategy tip), auto-grouped into a set per source tab. Manual passage creation as an
alternative to import. Passages render with tappable vocab annotations that can be attached to
the SRS queue in one action. Questions are click-to-answer with instant grading, the correct
choice highlighted, the explanation revealed, and a retry option. A wrong first answer
automatically logs a Mistake Notebook entry."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Import a personal study document as a batch of ready-to-study passages (Priority: P1)

As a user who already has a personal HTML study document full of reading-comprehension passages
(with questions, answers, and explanations already written), I want to paste that document in
and have every passage in it become available to study, so I don't have to retype dozens of
passages and questions by hand.

**Why this priority**: Without a fast way to load existing personal material, the feature has no
content to study — this is the same "unlocks the whole feature" role bulk import plays for the
Grammar catalog, and it's the highest-leverage single action a returning user takes.

**Independent Test**: Can be fully tested by pasting a study-document HTML page containing
several passages into the import tool and confirming every passage (with its questions, answer
key, explanations, translation, and tip) appears in the passage list afterward, grouped together
under one set.

**Acceptance Scenarios**:

1. **Given** a pasted HTML document containing several passage blocks, each with a title, a
   passage of text, one or more multiple-choice questions with a marked correct answer, an
   explanation per question, a translation, and a study tip, **When** the user imports it,
   **Then** every passage appears in their passage list with all of that content intact.
2. **Given** an import just completed, **When** the user looks at where the new passages landed,
   **Then** all of them are grouped into a single new set named after the source document's
   section/tab the passages came from.
3. **Given** a pasted document that contains no recognizable passage blocks, **When** the user
   attempts to import it, **Then** they see a clear "nothing found" message and no passages are
   created.
4. **Given** an import preview showing the passages about to be created, **When** the user
   reviews it before confirming, **Then** they can see each passage's title and question count
   ahead of time rather than being surprised after the fact.

---

### User Story 2 - Answer a passage's questions and get instant feedback (Priority: P2)

As a user studying a reading passage, I want to pick an answer for each question and immediately
see whether I was right, along with an explanation, so I can check my understanding without
leaving the page or waiting for grading.

**Why this priority**: This is the core study loop the whole feature exists to support — once
content exists (via User Story 1 or 3), this is what a user actually does with it every time.

**Independent Test**: Can be fully tested by opening any existing passage, selecting an answer
choice for a question, and confirming the correct choice is highlighted, an incorrect pick (if
chosen) is marked wrong, and the stored explanation appears — with a retry action available
afterward.

**Acceptance Scenarios**:

1. **Given** a passage with an unanswered question, **When** the user selects a choice that is
   correct, **Then** that choice is visibly marked correct and the explanation for the question
   appears.
2. **Given** a passage with an unanswered question, **When** the user selects a choice that is
   incorrect, **Then** the chosen choice is visibly marked wrong, the actually-correct choice is
   also highlighted, and the explanation appears.
3. **Given** a question the user just answered, **When** they use the retry action, **Then** the
   question resets to unanswered so they can attempt it again.
4. **Given** a passage with more than one question, **When** the user answers one question,
   **Then** the other questions in the same passage remain independently unanswered.

---

### User Story 3 - Create a passage by hand (Priority: P3)

As a user who wants to add a single reading passage that isn't part of any HTML document I have,
I want to write the passage, its questions, and their answers directly in the app, so I'm not
limited to only what I can bulk-import.

**Why this priority**: Extends the feature to content that doesn't originate from a pasted
document, but most of a user's content is expected to arrive via User Story 1, so this is
valuable but not blocking.

**Independent Test**: Can be fully tested by filling in a passage's text and at least one
question (with its choices, correct answer, and explanation) through a form, saving it, and
confirming it appears in the passage list and can be answered exactly like an imported passage.

**Acceptance Scenarios**:

1. **Given** a blank passage-creation form, **When** the user fills in a title, passage text, and
   at least one question with four choices and marks one as correct, **Then** saving creates a
   passage that immediately appears in their passage list.
2. **Given** a passage-creation form where no choice has been marked correct for a question,
   **When** the user tries to save, **Then** they see a validation message and the passage is not
   saved.
3. **Given** a saved manually-created passage, **When** the user opens it, **Then** it behaves
   identically to an imported passage (answerable questions, optional translation/tip shown if
   provided).

---

### User Story 4 - Send an unfamiliar word from a passage straight to the SRS queue (Priority: P4)

As a user reading a passage that has annotated vocabulary, I want to add a word I don't know
straight to my spaced-repetition review queue without retyping it, so new vocabulary I encounter
while reading doesn't get lost.

**Why this priority**: A valuable convenience that mirrors an existing capability on the
practice-log side of Reading, but the passage bank delivers its core value (Stories 1-3) without
it.

**Independent Test**: Can be fully tested by opening a passage with at least one annotated
vocabulary term, adding it to the SRS queue, and confirming it appears in the vocabulary review
list afterward with its word, reading, and meaning intact.

**Acceptance Scenarios**:

1. **Given** a passage with a term annotated with its reading and meaning, **When** the user taps
   or hovers the term, **Then** they see its reading and meaning without leaving the passage.
2. **Given** an annotated term's reading/meaning popup, **When** the user adds it to their SRS
   queue, **Then** it appears in their vocabulary review list with that reading and meaning
   pre-filled.

---

### Edge Cases

- What happens when the same HTML document is imported twice? Both imports succeed
  independently; the second import creates a second set of passages rather than being silently
  skipped or merged, consistent with how re-importing already exists for Grammar's own custom
  entries.
- What happens when a passage has no vocabulary annotations at all? It displays and can be
  answered normally, with no tappable terms.
- What happens when a passage has no translation or no study tip? Those sections simply don't
  appear, the same way an unset optional field behaves elsewhere in the app.
- What happens when a user retries a question after answering it wrong? The question resets to
  unanswered for another attempt; the Mistake Notebook entry already created from the first wrong
  attempt is not removed or duplicated by the retry.
- What happens when a user answers correctly on the very first attempt? No Mistake Notebook entry
  is created for that question.
- What happens when a user deletes a passage that has vocabulary already added to their SRS queue
  or wrong answers already logged to the Mistake Notebook? Those SRS entries and Mistake Notebook
  entries remain untouched; only their link back to the now-deleted passage is cleared.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST let a user paste in an HTML document and extract every recognizable
  passage block from it, each with: a title, the passage text (including any inline vocabulary
  annotations), one or more questions (each with choices, the correct choice, and an
  explanation), an optional translation, and an optional study tip.
- **FR-002**: System MUST show the user a preview of what will be imported (at minimum, each
  passage's title and question count) before the import is committed.
- **FR-003**: System MUST group every passage from one import operation into a single new set
  named after the source document's originating section, so a user's passages stay organized by
  where they came from.
- **FR-004**: System MUST let a user manually create a single passage — title, passage text,
  optional translation, optional study tip, and one or more questions each with choices, a
  designated correct choice, and an explanation.
- **FR-005**: System MUST reject saving a manually-created question that has no designated
  correct choice, with a clear validation message.
- **FR-006**: System MUST let a user optionally assign a manually-created passage to an existing
  set or leave it ungrouped.
- **FR-007**: System MUST display a passage's vocabulary annotations, if any, so a user can see
  each annotated term's reading and meaning without leaving the passage.
- **FR-008**: System MUST let a user add an annotated vocabulary term directly to their SRS
  review queue in a single action, pre-filled with that term's word, reading, and meaning.
- **FR-009**: System MUST let a user select an answer choice for a question and immediately show
  whether it was correct, without a separate submit step.
- **FR-010**: When a user answers a question, system MUST visibly distinguish the correct choice
  from an incorrectly-chosen one (when different) and reveal the question's stored explanation.
- **FR-011**: System MUST let a user reset an answered question back to unanswered and attempt it
  again.
- **FR-012**: System MUST automatically create a Mistake Notebook entry when a user's first
  attempt at a question is incorrect, identifying the passage and question and recording both the
  chosen and correct answers; system MUST NOT create an entry when the first attempt is correct
  or on any subsequent retry of the same question.
- **FR-013**: System MUST let a user delete a passage they created or imported.
- **FR-014**: System MUST let a user browse their passages grouped by set, consistent with how
  sets are already browsed elsewhere in the app.
- **FR-015**: Deleting a passage MUST NOT delete any SRS vocabulary entries or Mistake Notebook
  entries that originated from it; only their reference back to the passage is cleared.

### Key Entities

- **Reading Passage**: A single reading-comprehension exercise — title, passage text with
  optional inline vocabulary annotations (each a term plus its reading and meaning), an optional
  translation, an optional study tip, one or more Questions, and which Passage Set (if any) it
  belongs to. Always owned by the user who created or imported it.
- **Passage Question**: Belongs to one Reading Passage — question text, a fixed set of answer
  choices, which choice is correct, and an explanation shown after answering.
- **Passage Set**: A user's named grouping of their own Reading Passages, auto-created per import
  (named after the source section) or optionally chosen during manual creation — the same
  grouping concept already used for the user's custom grammar points and vocabulary.
- **Mistake Notebook Entry** *(existing entity, extended)*: Gains a new originating source for
  entries created from a wrongly-answered passage question, alongside its existing mock-test and
  manual sources.
- **SRS Vocabulary Entry** *(existing entity, extended)*: Gains a new optional originating link
  back to the Reading Passage a word was added from, alongside its existing link from the
  practice-log flow.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user with an existing personal study document can go from "document on my
  computer" to "every passage in it available to study" in a single import action, with zero
  retyping of passage or question content.
- **SC-002**: A user answering a question sees whether they were right or wrong, plus the
  explanation, within a single click — no separate submit step or page reload.
- **SC-003**: A user can create one complete passage (text plus at least one question) by hand,
  from a blank form to a saved, answerable passage, in one sitting.
- **SC-004**: 100% of first-attempt wrong answers appear in the Mistake Notebook without any
  extra action by the user beyond answering.
- **SC-005**: A user can move an unfamiliar word from a passage into their SRS review queue in a
  single action from within the passage.

## Assumptions

- All Reading Passages are owned by the user who created them (via import or manual entry) —
  there is no admin-curated global passage catalog to draw from, unlike Grammar's shared N2
  reference set.
- This feature covers reading passages only; listening/audio comprehension passages are out of
  scope.
- Editing an existing passage or question after creation is out of scope for this feature; a user
  who needs to change one deletes and recreates it. (Deletion, per FR-013, is in scope.)
- A retried question that is answered correctly the second time does not remove or alter the
  Mistake Notebook entry already created by the first wrong attempt — the notebook reflects "you
  got this wrong at least once," not current mastery.
- The existing practice-session log (durations, comprehension-score history) on the Reading page
  is unaffected by this feature; the passage bank is an additional, independent way to use the
  Reading page, not a replacement.
- This remains a solo-user application; no permissions, sharing, or multi-user considerations
  apply.
