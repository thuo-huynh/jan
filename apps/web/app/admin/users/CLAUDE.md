# apps/web/app/admin/users

User list/search + suspend/delete actions — calls `GET /api/admin/users`,
`POST /api/admin/users/:id/suspend`, `DELETE /api/admin/users/:id`. Relies entirely on
`app/admin/layout.tsx`'s server-side role gate; the route handlers re-verify admin status
independently on every call regardless (never trust this page's own render as an access check).

See the root [`CLAUDE.md`](../../../../../CLAUDE.md) for project-wide rules — this file only
notes what's local to this folder.
