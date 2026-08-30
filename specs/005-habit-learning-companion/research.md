# Research: Habit and Learning Companion

## Decision: Preserve existing structured learning data before introducing uploads

**Rationale**: The database already has user-owned vocabulary sets, grammar sets, reading-passage sets, reading questions, logs, and learning progress. The request for uploaded material defines a future direction but does not define supported file types, extraction, storage, or error behaviour. A Library read model over existing material satisfies the immediate browse-and-continue workflow without creating a fragile generic upload feature.

**Alternatives considered**: One JSONB `materials` table was rejected because searchable, progress-bearing content already lives in relational tables. A general file upload pipeline was deferred because it needs explicit storage and parsing requirements.

## Decision: Keep Kanban data intact and remove it from everyday IA

**Rationale**: Boards are clearly outside the new product purpose, but deleting their tables/routes could destroy useful data. Removing the route from primary navigation changes the product focus safely.

**Alternatives considered**: Drop all Kanban schema immediately was rejected as destructive. Rebrand tasks as habits was rejected because habits have daily-completion and streak semantics, not arbitrary columns and tasks.

## Decision: Use bounded server-side read models

**Rationale**: Existing dashboard and study-plan routes fetch raw lifetime logs to calculate charts and streaks. The home view only needs today's state, a 7-day activity window, and a small recent-material list. Fetching and calculating this server-side reduces payload and avoids duplicate client calculations.

**Alternatives considered**: A materialized database view is unnecessary at single-user scale. A broad client-side global store was rejected because server components already provide the needed fetch boundary.

## Decision: Extend the existing CSS-variable theme system

**Rationale**: Theme selection is persisted in the database and injected at server render time. Replacing it would risk flicker and break saved preferences. The redesign changes semantic token values and primitives rather than adding a second styling layer.

**Alternatives considered**: Installing a component library was rejected because the project already has coherent Tailwind primitives and a small surface area.
