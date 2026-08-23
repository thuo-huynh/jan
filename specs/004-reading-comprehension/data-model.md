# Phase 1 Data Model: Reading Comprehension Passage Bank

## `reading_passage_sets` (new table)

Same shape as `grammar_sets`/`vocab_sets` — a user's own named grouping, auto-created per import
or optionally chosen during manual creation.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | default `gen_random_uuid()` |
| `user_id` | `uuid` not null | FK → `profiles.id` on delete cascade |
| `name` | `text` not null | e.g. the source document's tab label, or user-typed |
| `created_at` | `timestamptz` not null | default `now()` |

Migration: `apps/supabase/migrations/0027_reading_passages.sql`

## `reading_passages` (new table)

Always user-owned — no `user_id IS NULL` global-catalog rows (unlike `grammar_points`), per
spec.md's Assumptions.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | default `gen_random_uuid()` |
| `user_id` | `uuid` not null | FK → `profiles.id` on delete cascade |
| `set_id` | `uuid` \| null | FK → `reading_passage_sets.id` on delete set null |
| `title` | `text` not null | |
| `passage_segments` | `jsonb` not null | array of `{type:'text', value}` \| `{type:'term', term, reading, meaning}` — see Application-level shapes below |
| `translation_vn` | `text` \| null | optional full translation |
| `tip` | `text` \| null | optional reading-strategy note |
| `created_at` | `timestamptz` not null | default `now()` |

Migration: `apps/supabase/migrations/0027_reading_passages.sql`

## `reading_passage_questions` (new table)

Belongs to one `reading_passages` row; ordered within a passage.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | default `gen_random_uuid()` |
| `passage_id` | `uuid` not null | FK → `reading_passages.id` on delete cascade |
| `order_index` | `int` not null | default `0`; display order within the passage |
| `question_text` | `text` not null | |
| `choices` | `text[]` not null | exactly 4 entries, enforced at the application layer (Zod), not a DB check |
| `correct_choice_index` | `int` not null | `0`-based index into `choices`; `check (correct_choice_index between 0 and 3)` |
| `explanation` | `text` not null | shown after answering |

No `user_id` column — ownership enforced via join to `reading_passages.user_id` in RLS
(research.md §7), same shape as `columns` → `boards`.

Migration: `apps/supabase/migrations/0027_reading_passages.sql`

```sql
create table if not exists public.reading_passage_sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_reading_passage_sets_user_id on public.reading_passage_sets (user_id);

create table if not exists public.reading_passages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  set_id uuid references public.reading_passage_sets (id) on delete set null,
  title text not null,
  passage_segments jsonb not null,
  translation_vn text,
  tip text,
  created_at timestamptz not null default now()
);

create index if not exists idx_reading_passages_user_id on public.reading_passages (user_id);
create index if not exists idx_reading_passages_set_id on public.reading_passages (set_id);

create table if not exists public.reading_passage_questions (
  id uuid primary key default gen_random_uuid(),
  passage_id uuid not null references public.reading_passages (id) on delete cascade,
  order_index int not null default 0,
  question_text text not null,
  choices text[] not null,
  correct_choice_index int not null check (correct_choice_index between 0 and 3),
  explanation text not null
);

create index if not exists idx_reading_passage_questions_passage_id
  on public.reading_passage_questions (passage_id);
```

## `vocab_entries` (existing table, extended)

Migration: `apps/supabase/migrations/0029_reading_passage_vocab_link.sql`

```sql
alter table public.vocab_entries
  add column if not exists source_reading_passage_id uuid
    references public.reading_passages (id) on delete set null;

create index if not exists idx_vocab_entries_source_reading_passage_id
  on public.vocab_entries (source_reading_passage_id)
  where source_reading_passage_id is not null;
```

Structurally identical to `source_reading_log_id` (`0013_vocab_reading_log_link.sql`) — see
research.md §8.

## `mistake_notebook` (existing table, extended)

Migration: `apps/supabase/migrations/0030_mistake_notebook_reading_quiz.sql`

```sql
alter table public.mistake_notebook
  drop constraint if exists mistake_notebook_source_check;

alter table public.mistake_notebook
  add constraint mistake_notebook_source_check
    check (source in ('mock_test', 'manual', 'reading_quiz'));
```

No new column — `content` carries passage/question context as free text (research.md §5).

## RLS (Phase 1 design; migration content, not yet applied)

Migration: `apps/supabase/migrations/0028_rls_reading_passages.sql`

- `reading_passage_sets`: owner-scoped via `user_id`, full CRUD — identical shape to
  `0026_rls_grammar_sets.sql`.
- `reading_passages`: owner-scoped via `user_id`, full CRUD — identical shape to
  `grammar_points`'s own-row policies in `0012_rls_reference_data.sql` minus the
  `user_id is null or` global-read branch (no global rows exist for this table).
- `reading_passage_questions`: owner-scoped via `exists (select 1 from reading_passages p where
  p.id = reading_passage_questions.passage_id and p.user_id = auth.uid())` on every policy —
  same join-to-parent shape as `columns` → `boards` (research.md §7).

## Application-level shapes (`features/reading-listening/types.ts`)

```ts
export type PassageSegment =
  | { type: 'text'; value: string }
  | { type: 'term'; term: string; reading: string; meaning: string };

export interface PassageQuestion {
  id: string;
  orderIndex: number;
  questionText: string;
  choices: string[]; // always length 4
  correctChoiceIndex: number;
  explanation: string;
}

export interface ReadingPassage {
  id: string;
  setId: string | null;
  title: string;
  segments: PassageSegment[];
  translationVn: string | null;
  tip: string | null;
  questions: PassageQuestion[];
}

export interface ReadingPassageSet {
  id: string;
  name: string;
  createdAt: string;
}
```

Row → prop mapping happens once in the new `features/reading-listening/lib/mapReadingPassage.ts`
(mirrors `mapGrammarPoint.ts`), so components never touch snake_case Supabase rows directly —
matches `coding-style.md`'s stated convention.

## Derived, not persisted

```ts
// features/reading-listening/lib/gradeAnswer.ts
export interface AnswerState {
  chosenIndex: number | null; // null = unanswered
  isCorrect: boolean | null;  // null until chosenIndex is set
}

export function gradeAnswer(question: PassageQuestion, chosenIndex: number): AnswerState {
  return { chosenIndex, isCorrect: chosenIndex === question.correctChoiceIndex };
}
```

Held as local component state in `ReadingPassageViewer` (one `AnswerState` per question, keyed by
question id); never written to the database (research.md §4). A wrong `AnswerState` on a
question's *first* grading triggers the one-time Mistake Notebook insert; the component tracks
"already logged this question" in the same local state so a retry's re-grading doesn't re-insert.
