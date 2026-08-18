# apps/web/app/(app)/settings

Appearance preferences (light/dark + color-theme picker). Backed by `features/appearance/`
(`AppearanceSettingsManager` client component). This is the UI for the DB-backed theme system
described in `apps/web/DESIGN.md` ("The DB-backed theme system") — changes here interact with
`public.themes` and `public.user_appearance_preferences`, plus the `theme` cookie read in
`app/layout.tsx`. Read that DESIGN.md section before touching this page's color logic.

See the root [`CLAUDE.md`](../../../../../CLAUDE.md) for project-wide rules — this file only
notes what's local to this folder.
