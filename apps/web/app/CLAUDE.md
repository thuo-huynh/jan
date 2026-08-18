# apps/web/app

Next.js App Router root. Route groups: `(app)` (authenticated shell), `(auth)` (public
login/signup), `admin` (role-gated), plus `api/**` (Route Handlers) and `auth/callback`
(Supabase PKCE exchange). Routes here should stay thin — auth guard + data fetch + compose; real
logic belongs in `apps/web/features/<domain>/`.

See the root [`CLAUDE.md`](../../../CLAUDE.md) for project-wide rules — this file only notes
what's local to this folder.
