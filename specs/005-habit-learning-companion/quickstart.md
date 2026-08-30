# Quickstart Validation: Habit and Learning Companion

## Prerequisites

- Configure the existing Supabase environment variables for `apps/web`.
- Run `npm run dev` from `apps/web`.
- Use a user account with sample habits and at least one learning record when possible.

## Validation scenarios

1. Sign in and open `/`. Confirm the main navigation only emphasizes Dashboard, Habits, Learn, Library, Progress, and Settings.
2. On Dashboard, toggle a habit. Reload and confirm the daily completion, count, and streak are retained.
3. If SRS items are due, activate Continue Learning and confirm it opens `/learn/review`.
4. Open `/library`, filter each available category, and confirm every material card opens an existing data-backed learning route.
5. Open `/progress` and confirm category figures and weekly activity reflect existing records.
6. Test at a narrow viewport. Navigation must remain usable, actions must have visible focus, and no horizontal overflow should occur.
7. Run `npm run lint` and `npm run build` in `apps/web`.
