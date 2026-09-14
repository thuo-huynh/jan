# Research: Daily Planning Workflow

## Decisions

- **One Daily Board, four projections:** Today, Calendar, Board, and Planner reuse current task rows, avoiding duplicate state.
- **Calendar target:** `calendar-day:${date}` sits inside the existing DnD context. A date drop changes `due_date` only; keyboard date editing remains available.
- **On-access recurrence:** a SECURITY INVOKER RPC derives `auth.uid()`, materializes due occurrences transactionally, and a unique schedule/date key prevents duplicates across tabs.
- **Fixed presets:** recurring routine, explicit completion-to-column, and read-only overdue review cover agreed needs; no rule language is built.
- **Accessible Planner:** day/week grids use 30-minute slots. Drag is supplemented by labelled menu controls for moving and resizing blocks.

## Alternatives rejected

- Separate planning tasks: creates sync errors.
- Client-only recurrence generation: cannot prevent concurrent duplicates.
- SECURITY DEFINER/service-role recurrence: broadens authorization surface.
- Pointer-only freeform block resizing: excludes keyboard users and is fragile responsively.
