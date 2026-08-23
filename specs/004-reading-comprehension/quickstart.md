# Quickstart: Reading Comprehension Passage Bank

Prerequisites: local Supabase running with migrations applied through
`0030_mistake_notebook_reading_quiz.sql`, a signed-in test user (`apps/web`'s normal dev auth
flow), and a personal study-doc HTML file containing at least one `.dokkai-item` block (source
format already used for Grammar's own HTML import).

## Setup

```bash
cd apps/web
npm run dev
```

## Validate User Story 1 — bulk HTML import

1. Go to `/learn/reading`, switch to the new passage-bank tab.
2. Open the import form, paste in the study-doc HTML.
3. Confirm the preview lists every passage found (title + question count) before importing.
4. Confirm the pasted document with no `.dokkai-item` blocks produces a clear "nothing found"
   message and creates nothing.
5. Import — confirm every passage now appears in the passage list, all grouped into one new set
   named after the source document's `dokkai` tab label.
6. Open one imported passage — confirm its passage text, all questions/choices/correct
   answer/explanation, translation, and tip all match the source document.

## Validate User Story 2 — click-to-answer quiz

1. Open any passage with at least one question.
2. Click a wrong choice — confirm it's marked wrong, the correct choice is also highlighted, and
   the explanation appears.
3. Click "try again" — confirm the question resets to unanswered.
4. Answer it correctly this time — confirm the correct choice is marked correct and the
   explanation appears again.
5. On a passage with 2+ questions, answer only one — confirm the other question(s) remain
   untouched/unanswered.

## Validate User Story 3 — manual passage creation

1. Open the manual passage-creation form.
2. Fill in a title, passage text (including at least one `{term|reading|meaning}` annotation), and
   one question with 4 choices, marking one correct, plus an explanation.
3. Try to save with no choice marked correct — confirm a validation message and nothing is saved.
4. Mark a choice correct and save — confirm the passage appears in the list and opens/answers
   identically to an imported passage, including the annotated term rendering as a tappable term.

## Validate User Story 4 — attach vocab term to SRS

1. Open a passage with at least one annotated term.
2. Tap/hover the term — confirm its reading and meaning appear without navigating away.
3. Add it to the SRS queue — confirm it now appears in the vocab review list
   (`/learn/vocab` or the review queue) with that word/reading/meaning pre-filled.

## Validate Mistake Notebook integration

1. Answer a question incorrectly on the first attempt — go to `/learn/mistakes` and confirm a new
   entry appears identifying the passage/question and both the chosen and correct answers.
2. Retry that same question and answer it correctly — confirm the Mistake Notebook entry from
   step 1 still exists exactly once (not duplicated, not removed).
3. Answer a different question correctly on the first attempt — confirm no new Mistake Notebook
   entry is created for it.

## Regression check

The existing practice-session log tab on `/learn/reading` (log entry form, history, session
stats, passage-type breakdown) behaves exactly as it did before this feature — no new tab content
bleeds into it, no new required fields, no console errors.
