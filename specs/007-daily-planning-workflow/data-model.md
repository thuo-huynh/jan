# Data Model: Daily Planning Workflow

- **Task metadata:** nullable `estimated_minutes` (5–720); future generated tasks additionally reference their schedule and occurrence date.
- **Template:** owner/board/default column plus title, description, tags, estimate, archive timestamps, and ordered template checklist items.
- **Schedule:** owner/template, daily/weekday/weekly/monthly cadence, anchor, selected ISO weekdays where applicable, next occurrence, enabled/deleted state.
- **Automation preset:** one owner/board preset row with fixed type, enabled boolean, and validated configuration; only completion stores a column id.
- **Focus block:** one task, start and end timestamps, and end later than start. Deleting a task cascades blocks; deleting a block retains its task.

Every root entity is owner-scoped by `auth.uid()` directly or via its task/template's Daily Board. Existing occurrences are historical records; pausing or deleting a schedule prevents only future creation.
