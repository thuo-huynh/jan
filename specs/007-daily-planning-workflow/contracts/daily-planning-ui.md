# Daily Planning UI Contracts

- `DailyTaskView` values: `today`, `calendar`, `board`, `planner`; Daily mode defaults to `today`.
- Calendar drop: `calendar-day:${YYYY-MM-DD}`, `{ type: 'calendar-day', date }`; it changes task due date only.
- Planner drop: `planner-slot:${YYYY-MM-DD}:${HH:mm}`, `{ type: 'planner-slot', startsAt }`; it creates or moves a focus block only.
- A client mutation either returns a persisted replacement entity or restores the exact pre-mutation snapshot and announces a Vietnamese error.
- Calendar date fields and Planner block menus provide keyboard alternatives for every drag behavior.
