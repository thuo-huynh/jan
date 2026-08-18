# apps/web/app/admin

Role-gated admin panel. `layout.tsx` performs the one authoritative server-side role check
(`profiles.role === 'admin'`, redirects to `/boards` otherwise) — every page under this folder is
a `'use client'` component that trusts that gate and does **not** re-check the role itself; the
underlying API routes (`app/api/admin/**`) re-verify independently regardless, since a client
check is never trustworthy on its own. Sub-routes: `users`, `content`, `stats`,
`reference-data`.

See the root [`CLAUDE.md`](../../../../../CLAUDE.md) for project-wide rules — this file only
notes what's local to this folder.
