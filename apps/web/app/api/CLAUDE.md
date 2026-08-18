# apps/web/app/api

Route Handlers: `admin/**` (users/content/stats/reference-data, all role-gated server-side),
`appearance`, `dashboard`, `mistakes/**`, `review-queue`, `reviews`. Most exist as a documented
contract for external/non-RSC consumers — where a Server Component needs the same data, it
typically calls the underlying `lib` function directly (e.g. `loadDashboardData`) instead of
fetching its own route over HTTP. Follow that pattern for new endpoints: put the logic in a
`features/<domain>/lib` function, have the route handler be a thin wrapper around it.

See the root [`CLAUDE.md`](../../../../CLAUDE.md) for project-wide rules — this file only notes
what's local to this folder.
