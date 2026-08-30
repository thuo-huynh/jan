# Data Model: Habit and Learning Companion

## Existing entities retained

| Entity | Role in product | Change in this feature |
|---|---|---|
| `habits` | User-created daily practices | Add a read-model/service layer only |
| `habit_completions` | Daily proof of completion | Keep row-exists semantics |
| `vocab_entries` + `user_vocab_progress` | Vocabulary material and SRS state | Expose via Library/dashboard summaries |
| `grammar_points` + `user_grammar_status` | Grammar material and progress | Expose via Library/dashboard summaries |
| `reading_passage_sets` + passages/questions/progress | Reading materials and answers | Expose via Library/dashboard summaries |
| `reading_logs` / `listening_logs` | Dated learning activity | Use bounded windows for activity summaries |
| `review_logs` | SRS learning activity | Use bounded windows for due/weekly progress |
| `study_goals` | Existing daily learning targets | Preserve; show only where helpful |

## Read-model concepts

### HomeSummary

Not persisted. Produced server-side from bounded source queries.

- `todayHabits`: habit id, name, completed state, streak
- `habitSummary`: completed/total, current/longest streak, weekly rate
- `learningSummary`: due count, category metrics, this-week minutes/reviews
- `recentMaterials`: title, category, item count/progress, destination href
- `weeklyActivity`: seven local days with minutes/reviews

### LibraryMaterial

Not persisted initially. A normalized presentation view over existing set tables and activity categories.

- `id`, `kind`, `title`, `category`, `itemCount`, `progress`, `lastStudiedAt`, `href`

## Future schema boundary

Only add `materials`, `lessons`, and `learning_items` after file upload format, ownership, storage retention, ingestion failure handling, and study-session semantics are specified. Any future migration must be additive and preserve the current category tables.
