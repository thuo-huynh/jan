# Feature Specification: Daily Planning Workflow

**Feature Branch**: `007-daily-planning-workflow`

**Created**: 2026-09-14

**Status**: Draft

**Input**: User description: "Research Trello to improve JanGo's Daily Tasks UI/UX, including the core daily workflow, recurring work, lightweight automation, and a focus-time Planner."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Plan and act on today's work (Priority: P1)

As a learner, I can open Daily Tasks directly into a focused Today view, create a study task quickly, and act on the next important task without scanning a full calendar and board at the same time.

**Why this priority**: The existing page exposes both a month calendar and a board at once. Separating the immediate daily decision from planning views makes the first action clear while retaining the same task data.

**Independent Test**: A signed-in learner creates a task for today, opens Today, and can find, open, reschedule, or complete it from that view.

**Acceptance Scenarios**:

1. **Given** the learner opens Daily Tasks, **When** no view has been selected, **Then** Today is shown with overdue work, work due today, and the next planned work in a clear priority order.
2. **Given** the learner is looking at a selected date, **When** they use Quick Add, **Then** the new task is created in the selected date's default to-do status with its title, optional tag, estimated duration, and due date visible before saving.
3. **Given** a task has a due date, checklist, estimate, tags, or repeat schedule, **When** the learner scans a task card, **Then** its applicable metadata is visible in a consistent badge order without opening the task.

---

### User Story 2 - Plan work across calendar and board (Priority: P1)

As a learner, I can move between Today, Calendar, and Board views and change a task's date by dragging it onto another day, so that scheduling and progress tracking stay in one coherent workflow.

**Why this priority**: One task should have one source of truth. The learner must not need to recreate work separately for the calendar and Kanban board.

**Independent Test**: A learner creates a dated task, moves it to a different date from Calendar or Board, refreshes the page, and sees the same updated task in all views.

**Acceptance Scenarios**:

1. **Given** a Daily Task exists, **When** the learner switches among Today, Calendar, and Board, **Then** each view shows the same title, status, date, checklist progress, and metadata for that task.
2. **Given** the learner drags a task onto another valid day in Calendar, **When** the drop succeeds, **Then** its due date updates immediately and remains updated after a refresh.
3. **Given** saving a date or status move fails, **When** the failure is reported, **Then** the task returns to its prior visible location and the learner receives a Vietnamese recovery message.
4. **Given** the learner has active filters, **When** they change views, **Then** the active filters remain apparent and can be removed in one action.

---

### User Story 3 - Find the right task quickly (Priority: P1)

As a learner, I can combine search with simple, visible quick filters such as Today, Overdue, This week, Incomplete, and Study work so that I can reduce a long board to the work that needs attention.

**Why this priority**: Filters only help if their effect and removal are obvious. Common date/status decisions should require fewer interactions than configuring a detailed form.

**Independent Test**: With dated, completed, incomplete, and tagged tasks present, a learner applies each quick filter and confirms only matching tasks are shown; clearing restores the complete result set.

**Acceptance Scenarios**:

1. **Given** tasks exist in multiple states and dates, **When** the learner selects a quick filter, **Then** only matching tasks are displayed and the active filter is visibly selected.
2. **Given** the learner combines quick filters with search or detailed filters, **When** they clear all filters, **Then** every filter is reset and the complete applicable task list returns.
3. **Given** no task matches a filter, **When** the result is shown, **Then** the empty state explains the condition and offers a clear reset action.

---

### User Story 4 - Reuse and repeat study routines (Priority: P2)

As a learner, I can save a study task as a template and schedule it to recur, so that recurring routines such as daily vocabulary review or a weekly mock test do not need to be rebuilt.

**Why this priority**: Repetition is central to language study, and reusable routines reduce planning friction without requiring a general-purpose automation builder.

**Independent Test**: A learner creates a template with a checklist, schedules it weekly, and observes exactly one correctly populated task for each scheduled occurrence.

**Acceptance Scenarios**:

1. **Given** an existing task, **When** the learner saves it as a template, **Then** its reusable title, description, tags, estimate, default status, and checklist are preserved without changing the original task.
2. **Given** an active recurrence, **When** an occurrence becomes due, **Then** one new task is created with the template's current contents and the schedule's date.
3. **Given** a recurrence is paused or deleted, **When** future dates arrive, **Then** no additional tasks are created and existing occurrences are retained.
4. **Given** a repeated task is visible, **When** the learner scans its card or detail, **Then** they can identify that it repeats and see its next occurrence.

---

### User Story 5 - Use guided automations safely (Priority: P2)

As a learner, I can enable a small catalogue of understandable planning presets, so that repetitive task actions happen predictably without configuring a rule language.

**Why this priority**: Personal planning benefits from automation, but a general workflow editor would add complexity before the daily workflow is proven.

**Independent Test**: A learner enables a provided preset, performs its stated trigger, and can verify the intended action; disabling the preset stops future actions.

**Acceptance Scenarios**:

1. **Given** the learner opens automation settings, **When** they inspect a preset, **Then** its trigger, action, scope, and enabled state are stated in Vietnamese before it is activated.
2. **Given** an enabled completion preset, **When** the learner completes an eligible task, **Then** the configured completion action runs once and is visible on the task.
3. **Given** an enabled overdue-management preset, **When** an eligible task becomes overdue, **Then** it is surfaced for action without deleting, silently rescheduling, or duplicating the learner's work.
4. **Given** a preset is disabled, **When** its trigger occurs, **Then** no new automated action is performed.

---

### User Story 6 - Reserve focused study time (Priority: P3)

As a learner, I can drag a task into a day or week Planner to reserve focus time, so that a due date becomes a concrete study session.

**Why this priority**: Time blocking connects the task board to actual study behavior while keeping a task's deadline distinct from when the learner plans to work on it.

**Independent Test**: A learner schedules a task into a Planner time slot, moves or resizes the block, refreshes, and confirms that the focus block persists while the task's due date stays unchanged.

**Acceptance Scenarios**:

1. **Given** an unscheduled task, **When** the learner drops it into an available Planner time slot, **Then** a linked focus block is created using the task estimate or the product's default focus duration.
2. **Given** a linked focus block, **When** the learner moves, resizes, or deletes it, **Then** only the block's time changes or is removed; the underlying task remains intact.
3. **Given** a task has one or more focus blocks, **When** the learner opens its details, **Then** they can see its scheduled focus time and navigate to it in Planner.
4. **Given** Planner contains no focus blocks for a selected day, **When** the learner opens it, **Then** an empty state explains how to schedule the next task.

### Edge Cases

- A task has no due date: it can appear in Board and Planner, but is not silently placed on a calendar day; Quick Add supplies the currently selected day by default.
- A drag target is invalid or a save fails: the task returns to its prior date, column, and order without data loss.
- A recurrence is opened after several missed dates: the system creates at most one task per eligible occurrence and never creates the same occurrence twice.
- A template is edited after prior occurrences exist: existing tasks remain historical records; future occurrences use the revised template.
- A recurrence is paused, deleted, or its source template is removed: already-created tasks remain editable; future generation stops safely.
- A Planner focus block is deleted or unlinked: it never deletes or completes the linked task.
- A task is made complete while it has future focus blocks: the learner is offered an explicit choice to retain or remove those blocks; no focus block is removed without confirmation.
- A view or filter has no matching work: the page provides a useful Vietnamese empty state and a visible action to clear filters or add a task.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Daily Tasks MUST provide Today, Calendar, Board, and Planner views over the same learner-owned Daily Board tasks.
- **FR-002**: Today MUST be the default view and MUST prioritize overdue tasks, tasks due on the selected date, and the learner's next planned work without rendering a full monthly calendar by default.
- **FR-003**: The interface MUST provide one clearly visible Quick Add action that creates a task with a title, selected date, default to-do status, optional tags, and optional estimated duration.
- **FR-004**: Calendar MUST show task summaries by day and allow a learner to create, open, edit, and reschedule tasks in calendar context.
- **FR-005**: A learner MUST be able to reschedule a task by dropping it on another valid calendar day; a successful move MUST update the same task's due date rather than create a duplicate.
- **FR-006**: Board MUST preserve existing column-based task ordering and status movement while offering the same task details and date changes as the other views.
- **FR-007**: Task cards MUST display only applicable metadata in this order: due state, checklist progress, estimate, tags, then repeat state; overdue, due-today, and completed states MUST remain visually distinguishable without relying on color alone.
- **FR-008**: Daily Tasks MUST provide search, detailed filtering, and quick filters for Today, Overdue, This week, Incomplete, and Study work; all active filters MUST be visible and clearable in one action.
- **FR-009**: Every mutation that changes task date, status, order, template, schedule, preset state, or focus block MUST either persist across refreshes or restore the prior visible state with a Vietnamese error message.
- **FR-010**: Learners MUST be able to create reusable task templates that preserve title, description, tags, default status, estimated duration, and an ordered checklist.
- **FR-011**: Learners MUST be able to create, edit, pause, resume, and delete a recurring schedule from a task template; supported schedules are daily, selected days of the week, weekly, and monthly.
- **FR-012**: Recurrence generation MUST be idempotent: each schedule can produce no more than one task for a given scheduled occurrence.
- **FR-013**: The product MUST offer a fixed catalogue of understandable automation presets for repeat generation, completion handling, and overdue management; it MUST NOT expose a free-form rule builder in this feature.
- **FR-014**: Automation presets MUST state their trigger and action before activation, be individually enabled or disabled, and never delete, duplicate, or silently reschedule a task.
- **FR-015**: Planner MUST support day and week time grids, creating a focus block by scheduling a task, and moving, resizing, unlinking, or deleting a focus block.
- **FR-016**: A focus block MUST link to one task and store a start and end time independently from that task's due date; changing or deleting the block MUST NOT change or delete the task.
- **FR-017**: The initial focus-block length MUST use a task's estimate when present and otherwise use a documented default duration.
- **FR-018**: All new learner-facing copy, labels, controls, empty states, and failure messages MUST be Vietnamese, keyboard-accessible, and usable at mobile and desktop widths.
- **FR-019**: The feature MUST preserve existing non-daily Kanban boards, existing Daily Task records, and current task checklists without data migration loss.

### Key Entities *(include if feature involves data)*

- **Daily task**: A learner-owned work item with a board status, optional due date, checklist, tags, estimate, completion state, and optional recurrence reference.
- **Task template**: A reusable definition of a study task, including its default content, status, estimate, and ordered checklist; it is not itself a scheduled task occurrence.
- **Recurring schedule**: A learner-controlled rule connecting a template to recurring dates, its enabled state, and the next due occurrence.
- **Automation preset**: One user-configurable instance of a fixed, documented trigger-action recipe for personal task handling.
- **Focus block**: A time-bound personal study reservation linked to one Daily Task; it is independent from the task's deadline and completion record.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A learner can create a task for today from Daily Tasks in no more than three interactions after entering its title.
- **SC-002**: A learner can identify the count of overdue, due-today, and completed work for the selected date without opening an individual task.
- **SC-003**: In acceptance testing, 100% of successful date and status changes appear consistently in Today, Calendar, and Board after a page refresh.
- **SC-004**: A learner can reschedule a dated task to another calendar day with one drag-and-drop action or no more than two keyboard-accessible actions.
- **SC-005**: A learner can create a weekly recurring study routine, including a checklist, in under two minutes and receives no duplicate occurrence for the same scheduled date.
- **SC-006**: A learner can reserve focus time for a task in no more than three interactions, and changing that reservation does not alter the task's due date.
- **SC-007**: At 320px and desktop widths, every new core action, view switch, filter reset, and task card can be reached and operated with a keyboard.

## Assumptions

- This is a single-user personal planning experience; team assignment, shared boards, external-calendar synchronization, and multi-user workload analytics are out of scope.
- Existing Daily Board columns remain the source of task status. The product uses the learner's chosen completion column rather than assuming a fixed column name.
- The initially shipped Planner is an internal time-blocking surface; it does not synchronize with Google Calendar, Outlook, or another external calendar.
- The initial automation catalogue is intentionally limited to predictable built-in presets. A natural-language or free-form automation builder is out of scope.
- Recurrent task occurrences are generated safely when the learner accesses Daily Tasks or explicitly refreshes schedules; this release does not promise a background notification at an exact clock time.
- The default focus duration is 25 minutes when a task has no estimated duration.
- JanGo's existing theme tokens, Vietnamese voice, accessibility conventions, and calm personal-learning hierarchy remain binding.
