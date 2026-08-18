# apps/web/app/auth

`callback/route.ts` — the Supabase PKCE callback: exchanges the `?code=` param from
confirmation/magic-link emails for a session cookie (`exchangeCodeForSession`). Required for
signup/login's `emailRedirectTo` flow to actually complete; without this route the user lands on
a page with an unused `?code=` and no session.

See the root [`CLAUDE.md`](../../../../CLAUDE.md) for project-wide rules — this file only notes
what's local to this folder.
