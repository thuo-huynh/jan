# apps/web/app/(app)/habits

Month-view habit grid (habits as rows, days as columns). Backed by `features/habits/`
(`HabitGridManager` client component + `lib/streak.ts`, `lib/calendar.ts`). This is the
reference implementation for "lively" micro-interactions in this app — streak tiers
(`StreakBadge`), tick-pop animation, and the confetti `CelebrationBanner` — see
`.claude/rules/design-system.md` for how to reuse those elsewhere.

See the root [`CLAUDE.md`](../../../../../CLAUDE.md) for project-wide rules — this file only
notes what's local to this folder.
