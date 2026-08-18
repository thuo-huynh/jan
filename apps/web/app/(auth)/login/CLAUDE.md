# apps/web/app/(auth)/login

Public login page, client-rendered (`'use client'`), wrapped in `shared/components/AuthShell`.
Uses the browser Supabase client (`shared/supabase/client.ts`), not the server one — this route
runs before any session exists.

See the root [`CLAUDE.md`](../../../../../CLAUDE.md) for project-wide rules — this file only
notes what's local to this folder.
