# Tech stack & architecture

- **Frontend**: Next.js 14 App Router, React 18, TypeScript, Tailwind CSS 3. Icons:
  `lucide-react` only (no other icon package, no hand-rolled SVG icons — see design-system.md).
- **Backend**: Supabase (Postgres + Auth + RLS). No separate API server — Next.js Route Handlers
  under `app/api/**` plus direct Supabase calls (guarded by RLS) from Server/Client Components.
- **Auth**: `@supabase/ssr`. Server-side: `createClient()` + `getAuthedUser()` from
  `shared/supabase/server.ts` — `getAuthedUser` is wrapped in React's `cache()` so it dedupes
  across layout/page renders within one request; use it instead of calling
  `supabase.auth.getUser()` directly in a new Server Component. Client-side:
  `shared/supabase/client.ts`. `middleware.ts` does a first-pass route gate, but each route
  group's `layout.tsx` still re-checks and redirects to `/login` itself (defense in depth) — do
  not assume middleware alone is sufficient when adding a new authenticated route.
- **Feature-folder pattern**: routes in `app/**` are thin (auth guard + data fetch + compose);
  real logic/components live in `features/<domain>/{components,lib}`. When adding a page, put
  the substance in a feature folder, not directly under `app/`.
- **Route groups**: `app/(app)/*` = authenticated main shell (nav in `app/(app)/layout.tsx`),
  `app/(auth)/*` = login/signup (public), `app/admin/*` = role-gated admin panel (server-side
  role check against `profiles.role` in `app/admin/layout.tsx` — client pages under it don't
  re-check and shouldn't).
- **Migrations**: `apps/supabase/migrations/NNNN_description.sql`, sequential zero-padded
  numbering, one concern per file. RLS policies for a new table typically ship as their own
  follow-up migration (e.g. `0015_habits.sql` + `0016_rls_habits.sql`) rather than inline —
  match that split for new tables.
- **Spec-kit workflow**: substantial features get a `specs/NNN-feature-slug/` folder
  (`spec.md` → `plan.md` → `tasks.md`) via the `speckit-*` skills before implementation. Check
  `specs/` for prior art before redesigning an existing feature.
- **Tests**: `apps/web/tests/{unit,integration,e2e}` exist as scaffolding only (currently empty,
  no test runner wired up) — don't assume Jest/Vitest/Playwright is configured; check
  `package.json` before writing tests that assume one exists.
