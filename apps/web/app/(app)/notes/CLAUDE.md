# apps/web/app/(app)/notes

Notes list/search (`page.tsx`, filtered by `q`/`folder`/`tag`/`pinned` URL params written by the
client `NoteFilters`) + `[noteId]` detail/editor. Backed by `features/notes/` — markdown preview
uses `react-markdown` + `rehype-sanitize`, styled via the `.markdown-body` classes in
`app/globals.css` (no `@tailwindcss/typography` plugin installed).

See the root [`CLAUDE.md`](../../../../../CLAUDE.md) for project-wide rules — this file only
notes what's local to this folder.
