# JanGo

JanGo is a personal Habit Tracker and Learning Companion for daily consistency and self-directed Japanese study.

## Product areas

- Dashboard: today’s habits, next learning action, weekly activity, and consistency.
- Habits: daily completion history and streaks.
- Learn: vocabulary, grammar, reading, listening, and SRS review.
- Library: browse learning material already added to the app.
- Progress: useful habit and learning summaries without an analytics-heavy dashboard.

Legacy Kanban routes remain available to protect existing data, but are not part of primary navigation.

## Local development

From `apps/web`:

```bash
npm install
npm run dev
```

Configure Supabase values in `apps/web/.env.local` before starting the app.

```bash
npm run lint
npm run build
```

## Structure

- `apps/web`: Next.js app.
- `apps/supabase`: Supabase configuration and safe sequential SQL migrations.
- `specs/005-habit-learning-companion`: active restructure specification and delivery tasks.
