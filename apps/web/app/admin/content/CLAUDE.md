# apps/web/app/admin/content

Content moderation (search/inspect/remove) — calls `GET/DELETE /api/admin/content/**`. Note:
`grammar_notes` maps to `user_grammar_status.notes_user` (see `app/api/admin/content/_shared.ts`)
— "deleting" one clears the note rather than removing the whole status row, so its action button
reads "Clear note" instead of "Delete". Keep that distinction if you touch this page's copy.

See the root [`CLAUDE.md`](../../../../../CLAUDE.md) for project-wide rules — this file only
notes what's local to this folder.
