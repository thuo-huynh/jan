# apps/web/app/(auth)/signup

Public signup page, client-rendered, wrapped in `shared/components/AuthShell`. On success the
user lands in an "check your email" state (`MailCheck` icon) rather than being auto-logged-in —
the actual session is created by `app/auth/callback` when the confirmation link is opened.

See the root [`CLAUDE.md`](../../../../../CLAUDE.md) for project-wide rules — this file only
notes what's local to this folder.
