# Daily Planning Workflow Validation

Apply migrations `0038`–`0043`, then from `apps/web` run:

```powershell
node --test tests/unit/daily-task-calendar.test.mjs tests/unit/daily-tasks-navigation.test.mjs tests/unit/daily-task-planning.test.mjs tests/unit/recurrence.test.mjs
npm run format:check
npm run lint
npm run build
```

Manually create a task with estimate; confirm view consistency and Calendar rollback; combine/clear filters; create/pause/edit a recurrence without duplicate occurrences; enable each fixed preset; create/move/resize/delete a focus block without changing the task due date; then repeat essential keyboard actions at 320px and desktop widths.
