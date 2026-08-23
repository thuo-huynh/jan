# Phase 0 Research: Reading Comprehension Passage Bank

## 1. Passage content storage: structured segments vs. raw HTML

**Decision**: Store passage text as a JSON array of segments —
`{type: 'text', value: string} | {type: 'term', term: string, reading: string, meaning: string}`
— not as a raw HTML string.

**Rationale**: The codebase has no precedent for rendering arbitrary stored markup via
`dangerouslySetInnerHTML`; `GrammarMarkdown.tsx` is the closest analog and explicitly runs
everything through `rehype-sanitize` because "notes and comparison_note are... never trusted
as-is." A segment array sidesteps the sanitization question entirely (there is no markup to
sanitize) and lets each `term` segment be a normal React component carrying its own
tap/hover-popover and "add to SRS" button, rather than needing event delegation into an injected
HTML string. The HTML importer and the manual-entry form both produce this same array, so the
viewer only ever needs one rendering code path.

**Alternatives considered**: Raw HTML string + `dangerouslySetInnerHTML` + a custom sanitizer
allow-listing `span.keigo-term` — rejected: diverges from the codebase's only existing rich-text
pattern, and wiring a React "add to SRS" click handler onto sanitizer-output HTML requires DOM
event delegation the rest of the app doesn't use anywhere.

## 2. HTML import parser

**Decision**: New `parseReadingHtml.ts`, structurally mirroring `parseGrammarHtml.ts`: runs
`DOMParser` client-side (browser-only, only ever called from a `'use client'` component), builds
the same `tabLabelById` map from `[data-tab]` buttons for per-source-tab set naming, and walks
`.dokkai-item` blocks.

Per item:
- Title: `.dokkai-header`'s first `<span>` text (drop the arrow span).
- Passage: walk `.passage-box` child nodes — text nodes become `{type:'text'}` segments,
  `span.keigo-term` nodes become `{type:'term', term: textContent, reading: data-jp attribute,
  meaning: data-vn attribute}`.
- Questions: one entry per `.question-box` — `.q-text` (minus its `問N` counter, which is
  positional rather than stored), each `<li>`'s text (minus its `data-num` counter) as a choice,
  the `<li class="correct-choice">` index as the correct choice, `.explain-box` text (minus its
  `.box-label`) as the explanation.
- `translation_vn` from `.translate-box`, `tip` from `.tip-box` — both minus their `.box-label`,
  both optional (a document without either produces `null`, per spec.md's Edge Cases).

**Rationale**: This is the exact structure confirmed by inspecting the user's real source
document (a `.dokkai-item` block under the `dokkai` tab of the same personal study-doc format
already used for Grammar import) — not a guess. Reusing `parseGrammarHtml.ts`'s tab-label-lookup
and DOM-walking approach keeps one shared mental model for "how HTML import works" across both
features instead of a second, differently-shaped parser.

**Alternatives considered**: A generic/configurable HTML-import framework shared between Grammar
and Reading — rejected as premature abstraction; the two source shapes (`td.pattern` table rows
vs. `.dokkai-item` blocks) are different enough that a shared abstraction would need as many
escape hatches as it saves lines, and `coding-style.md` explicitly discourages speculative
abstraction over duplication this small (two ~100-line parser files).

## 3. Manual-entry inline term syntax

**Decision**: The manual passage-creation form's passage-body textarea accepts plain text with an
inline annotation syntax — `{term|reading|meaning}`, e.g. `{規則|きそく|quy tắc}` — parsed by a new
`parseInlinePassageSyntax.ts` into the same segment array the HTML importer produces. The term
itself sits inside the braces too (not `term{reading|meaning}` as first sketched during
brainstorming): Japanese text has no whitespace between words, so there is no reliable way to
detect where an unbracketed term would start without risking it swallowing preceding text.

**Rationale**: A structured multi-field UI for "type text, then select a substring, then fill in
a popup" is a much bigger, fussier build (selection-range tracking, a floating annotation editor)
than the value justifies for what is explicitly the lower-priority manual-entry path (P3, behind
import). A single delimited inline syntax is learnable in one glance at a placeholder/example, and
the parser is a small regex-driven pure function, not a rich-text editor.

**Alternatives considered**: No inline annotation support in manual entry (passage body is always
plain, unannotated text) — rejected: FR-007 requires passages to display vocabulary annotations
when present, and a manually-created passage should be able to reach parity with an imported one
(User Story 3's acceptance scenario 3) rather than being permanently second-class.

## 4. Quiz grading model

**Decision**: Answering is entirely client-side, ephemeral UI state — `answered: boolean`,
`chosenIndex: number | null` per question, held in the `ReadingPassageViewer` component. No
"attempt" or "score" row is persisted anywhere. The only side effect of a wrong first answer is
the Mistake Notebook insert (see §5); a correct answer or a retry has no database write at all.

**Rationale**: Directly matches spec.md's User Story 2 acceptance scenarios (instant grading, no
submit step, retry resets to unanswered) and Edge Cases (retry doesn't remove/duplicate the
Mistake Notebook entry from the original wrong attempt) — both scenarios describe pure
client-side state transitions. Persisting attempt history isn't required by any FR/SC, and adding
it would need a new table with no spec-backed consumer.

**Alternatives considered**: Persisting every answer attempt (a `reading_passage_attempts` table)
to support future analytics — rejected as speculative; nothing in spec.md asks for
attempt-history display or scoring, and YAGNI applies (`coding-style.md`).

## 5. Mistake Notebook integration

**Decision**: Widen `mistake_notebook.source`'s check constraint to add `'reading_quiz'`
alongside the existing `'mock_test'` and `'manual'` values. On a wrong first answer, insert
`{source: 'reading_quiz', content: "<passage title> 問<n>: <question text> — chọn: <wrong
choice>, đúng: <correct choice>"}`. No new FK column linking the mistake row back to the passage
or question.

**Rationale**: `mock_test_results` — the only other non-`manual` source — already has no
dedicated link column on `mistake_notebook` (confirmed in `MistakeEntryForm.tsx`'s own comment:
"no mock-test-to-mistake pipeline exists yet... this form always writes `source = 'manual'`"), so
there's no established "linked source row" pattern to extend; free-text `content` carrying enough
context to identify the passage/question is consistent with how `mistake_notebook` is used today
and satisfies FR-012 without a new column, index, or `ON DELETE` policy to reason about.

**Alternatives considered**: A `linked_reading_passage_id` FK column, mirroring
`linked_vocab_id`/`linked_grammar_id` — rejected: those two links exist because the mistake
notebook's own UI actively surfaces "here's the vocab/grammar item this mistake was about" as a
navigable reference (`MistakeRow.tsx`); nothing in spec.md's User Story 2 or FR-012 asks for that
navigability for reading mistakes, so the column would have no reader.

## 6. Set auto-grouping on import

**Decision**: Identical convention to `0025_grammar_sets.sql`: all passages from one import
operation are inserted with the same new (or reused, if a set with that exact tab-derived name
already exists for the user) `reading_passage_sets` row, named after the source `[data-tab]`
label the `dokkai-item`s were found under.

**Rationale**: Directly required by FR-003 and User Story 1's acceptance scenario 2, and reuses a
convention the user has already seen and approved for Grammar — no new UX to design or explain.

## 7. RLS for `reading_passage_questions` (child table, no `user_id` column)

**Decision**: `reading_passage_questions` has no `user_id` column of its own; ownership is
enforced via an `exists (select 1 from reading_passages p where p.id =
reading_passage_questions.passage_id and p.user_id = auth.uid())` check on every policy —
the same join-to-parent shape `0011_rls_owner_scoped.sql` already uses for `columns` (joined to
`boards.user_id`), not the denormalized-column shape it uses for `tasks` (which needed to avoid a
*two*-level join, `tasks -> columns -> boards`). `reading_passage_questions -> reading_passages`
is only one level deep, so a plain join is the established precedent, not a shortcut.

**Rationale**: Matches the exact prior art in this codebase rather than introducing a third RLS
shape; a denormalized `user_id` column would just be a write-time invariant to keep in sync for
no join-depth benefit at this table depth.

## 8. Vocab attach provenance

**Decision**: New nullable `vocab_entries.source_reading_passage_id uuid references
reading_passages(id) on delete set null`, populated by `AttachTermToSrsButton` alongside
`word`/`reading`/`meaning` on insert — structurally identical to the existing
`source_reading_log_id` column `0013_vocab_reading_log_link.sql` added for the reading-log's own
attach-to-SRS flow, including the `on delete set null` so a vocab entry survives its source
passage being deleted (spec.md Edge Cases: "only their link back to the now-deleted passage is
cleared").

**Rationale**: Direct precedent, same table, same feature domain, same shape of problem
("provenance without a join table"). No reason to deviate.
