# apps/web/app/(app)/learn

JLPT N2 study tools: `dashboard`, `vocab`, `grammar` (+ `grammar/confusables/[pairId]`),
`reading`, `listening`, `review`, `study-plan`, `mistakes`, `mock-tests`. Shared shell is
`layout.tsx` + `features/dashboard/components/LearnNav.tsx` (the pill-tab sub-nav rendered above
every page in this folder). Each page is a thin Server Component; backing logic/components live
in the matching `features/<domain>/` folder (`vocab-srs`, `grammar`, `reading-listening`,
`study-plan`, `mistakes`, `mock-tests`, `dashboard`).

`dashboard/page.tsx` calls `features/dashboard/lib/aggregate.ts`'s `loadDashboardData` directly
(the same function `GET /api/dashboard` uses) — extend that shared function rather than adding a
second query path if the dashboard needs a new stat.

See the root [`CLAUDE.md`](../../../../../CLAUDE.md) for project-wide rules — this file only
notes what's local to this folder.
