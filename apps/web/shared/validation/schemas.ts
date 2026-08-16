import { z } from 'zod';

/**
 * Shared zod v4 validation schemas for forms and API route handlers.
 * Field sets are derived directly from data-model.md — only form-editable,
 * user-supplied fields are included; server-managed fields (id, created_at/
 * updated_at, SRS scheduling columns, generated columns like
 * `notes.search_vector`) are intentionally excluded since they're never
 * submitted by a client.
 */

const uuid = z.string().uuid();
/** `YYYY-MM-DD`, matching Postgres `date` columns (due_date, test_date, etc.). */
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD');

// ---------------------------------------------------------------------------
// Kanban: boards / columns / tasks / task_checklist_items
// ---------------------------------------------------------------------------

export const boardSchema = z.object({
  name: z.string().trim().min(1, 'Board name is required').max(200),
});
export type BoardInput = z.infer<typeof boardSchema>;

export const columnSchema = z.object({
  boardId: uuid,
  name: z.string().trim().min(1, 'Column name is required').max(100),
  position: z.number().int().min(0).optional(),
});
export type ColumnInput = z.infer<typeof columnSchema>;

export const checklistItemSchema = z.object({
  taskId: uuid,
  text: z.string().trim().min(1, 'Checklist item text is required').max(500),
  completed: z.boolean().optional().default(false),
  position: z.number().int().min(0).optional(),
});
export type ChecklistItemInput = z.infer<typeof checklistItemSchema>;

export const taskSchema = z.object({
  columnId: uuid,
  boardId: uuid,
  title: z.string().trim().min(1, 'Title is required').max(200),
  description: z.string().max(10_000).optional().nullable(),
  tags: z.array(z.string().trim().min(1).max(50)).max(20).optional().default([]),
  dueDate: isoDate.optional().nullable(),
  assigneeId: uuid.optional().nullable(),
  position: z.number().int().min(0).optional(),
});
export type TaskInput = z.infer<typeof taskSchema>;

// ---------------------------------------------------------------------------
// Vocab / kanji (vocab_entries — custom entry form, T052)
// ---------------------------------------------------------------------------

export const vocabEntrySchema = z.object({
  word: z.string().trim().min(1, 'Word is required').max(200),
  reading: z.string().trim().max(200).optional().nullable(),
  meaning: z.string().trim().min(1, 'Meaning is required').max(1000),
  example: z.string().trim().max(1000).optional().nullable(),
  jlptLevel: z.string().trim().max(10).optional().nullable(),
  isKanji: z.boolean().optional().default(false),
});
export type VocabEntryInput = z.infer<typeof vocabEntrySchema>;

// ---------------------------------------------------------------------------
// Grammar (user_grammar_status — status + personal note, T043/T044)
// ---------------------------------------------------------------------------

export const grammarStatusEnum = z.enum(['not_started', 'learning', 'mastered']);

export const grammarStatusSchema = z.object({
  grammarPointId: uuid,
  status: grammarStatusEnum,
});
export type GrammarStatusInput = z.infer<typeof grammarStatusSchema>;

export const grammarNoteSchema = z.object({
  grammarPointId: uuid,
  notesUser: z.string().max(10_000).optional().nullable(),
});
export type GrammarNoteInput = z.infer<typeof grammarNoteSchema>;

// ---------------------------------------------------------------------------
// Notes (freeform markdown notes)
// ---------------------------------------------------------------------------

export const noteSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200),
  bodyMarkdown: z.string().max(50_000).optional().default(''),
  folder: z.string().trim().max(100).optional().nullable(),
  tags: z.array(z.string().trim().min(1).max(50)).max(20).optional().default([]),
  pinned: z.boolean().optional().default(false),
  linkedTaskId: uuid.optional().nullable(),
  linkedVocabId: uuid.optional().nullable(),
});
export type NoteInput = z.infer<typeof noteSchema>;

// ---------------------------------------------------------------------------
// Log entries (reading_logs / listening_logs)
// ---------------------------------------------------------------------------

const logEntryBase = {
  source: z.string().trim().min(1, 'Source is required').max(300),
  durationMin: z.number().int().min(0, 'Duration must be zero or more'),
  comprehensionScore: z.number().int().min(0).max(100).optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
  practicedAt: z.string().datetime().optional(),
};

export const readingLogSchema = z.object({
  ...logEntryBase,
  passageType: z.string().trim().max(100).optional().nullable(),
});
export type ReadingLogInput = z.infer<typeof readingLogSchema>;

export const listeningLogSchema = z.object({
  ...logEntryBase,
});
export type ListeningLogInput = z.infer<typeof listeningLogSchema>;
