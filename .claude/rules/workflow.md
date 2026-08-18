# Workflow

- **Commit style**: short, imperative, present-tense subject describing the user-facing outcome;
  no body needed for small changes (see recent log: "Add keyboard shortcuts, back link, a11y
  labels, loading skeletons", "Replace window.confirm() with a styled ConfirmDialog"). Several
  small related fixes landing together can share one commit — don't split into artificial
  micro-commits.
- **Spec-kit for larger features**: `specs/NNN-feature-slug/spec.md` → `plan.md` → `tasks.md`,
  produced by the `speckit-specify` / `speckit-plan` / `speckit-tasks` skills and executed via
  `speckit-implement`. For a small fix or a UI polish pass, skip the ceremony — spec-kit is for
  features substantial enough to warrant a written plan first.
- **Doc comments reference task/requirement IDs** from their originating spec (e.g. `T077`,
  `US8`, `FR-028`) when the work traces back to one — check `specs/**/tasks.md` and follow that
  ID scheme rather than inventing a new one.
