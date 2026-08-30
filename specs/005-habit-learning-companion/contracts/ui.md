# UI Contracts

## Home summary contract

`loadHomeSummary(client, userId, now)` returns only presentation-neutral data. It must not mutate data and must not fetch unlimited history. Dashboard components receive this object and do not independently query or recompute its aggregates.

## Habit completion contract

Habit completion remains the existing row-exists model: inserting one unique `(habit_id, completion_date)` row marks completion; removing that row reverts it. Any optimistic client interaction must restore prior local state when the database request fails.

## Library material contract

Every material card has a real existing route, category, title, and count/progress. A card never shows artificial progress merely to fill a visual slot.
