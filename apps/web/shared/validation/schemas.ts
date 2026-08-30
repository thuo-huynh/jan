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
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Định dạng phải là YYYY-MM-DD');

// ---------------------------------------------------------------------------
// Kanban: boards / columns / tasks / task_checklist_items
// ---------------------------------------------------------------------------

export const boardSchema = z.object({
  name: z.string().trim().min(1, 'Tên bảng là bắt buộc').max(200),
});
export type BoardInput = z.infer<typeof boardSchema>;

export const columnSchema = z.object({
  boardId: uuid,
  name: z.string().trim().min(1, 'Tên cột là bắt buộc').max(100),
  position: z.number().int().min(0).optional(),
});
export type ColumnInput = z.infer<typeof columnSchema>;

export const checklistItemSchema = z.object({
  taskId: uuid,
  text: z.string().trim().min(1, 'Nội dung mục checklist là bắt buộc').max(500),
  completed: z.boolean().optional().default(false),
  position: z.number().int().min(0).optional(),
});
export type ChecklistItemInput = z.infer<typeof checklistItemSchema>;

export const taskSchema = z.object({
  columnId: uuid,
  boardId: uuid,
  title: z.string().trim().min(1, 'Tiêu đề là bắt buộc').max(200),
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

export const vocabSetSchema = z.object({
  name: z.string().trim().min(1, 'Tên set là bắt buộc').max(100),
});
export type VocabSetInput = z.infer<typeof vocabSetSchema>;

export const vocabEntrySchema = z.object({
  word: z.string().trim().min(1, 'Từ là bắt buộc').max(200),
  reading: z.string().trim().max(200).optional().nullable(),
  meaning: z.string().trim().min(1, 'Nghĩa là bắt buộc').max(1000),
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
  title: z.string().trim().min(1, 'Tiêu đề là bắt buộc').max(200),
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
  source: z.string().trim().min(1, 'Nguồn là bắt buộc').max(300),
  durationMin: z.number().int().min(0, 'Thời gian phải từ 0 trở lên'),
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

/** "Attach unknown word to SRS" quick-add from a reading log entry (T059). */
export const attachToSrsSchema = z.object({
  word: z.string().trim().min(1, 'Từ là bắt buộc').max(200),
  reading: z.string().trim().max(200).optional().nullable(),
  meaning: z.string().trim().min(1, 'Nghĩa là bắt buộc').max(1000),
  sourceReadingLogId: uuid,
});
export type AttachToSrsInput = z.infer<typeof attachToSrsSchema>;

/** Attach a passage's annotated vocab term to SRS (specs/004-reading-comprehension US4). */
export const attachTermToSrsSchema = z.object({
  word: z.string().trim().min(1, 'Từ là bắt buộc').max(200),
  reading: z.string().trim().max(200).optional().nullable(),
  meaning: z.string().trim().min(1, 'Nghĩa là bắt buộc').max(1000),
  sourceReadingPassageId: uuid,
});
export type AttachTermToSrsInput = z.infer<typeof attachTermToSrsSchema>;

// ---------------------------------------------------------------------------
// Reading passage bank (reading_passages / reading_passage_questions —
// specs/004-reading-comprehension)
// ---------------------------------------------------------------------------

const passageSegmentSchema = z.union([
  z.object({ type: z.literal('text'), value: z.string().min(1) }),
  z.object({
    type: z.literal('term'),
    term: z.string().trim().min(1),
    reading: z.string().trim(),
    meaning: z.string().trim().min(1),
  }),
]);

export const readingPassageQuestionSchema = z.object({
  questionText: z.string().trim().min(1, 'Câu hỏi là bắt buộc').max(1000),
  choices: z.array(z.string().trim().min(1, 'Đáp án không được để trống').max(500)).length(4, 'Cần đúng 4 đáp án'),
  correctChoiceIndex: z.number().int().min(0).max(3),
  explanation: z.string().trim().min(1, 'Giải thích là bắt buộc').max(5000),
});
export type ReadingPassageQuestionInput = z.infer<typeof readingPassageQuestionSchema>;

export const readingPassageSchema = z.object({
  title: z.string().trim().min(1, 'Tiêu đề là bắt buộc').max(300),
  segments: z.array(passageSegmentSchema).min(1, 'Nội dung bài đọc là bắt buộc'),
  translationVn: z.string().trim().max(10000).optional().nullable(),
  tip: z.string().trim().max(5000).optional().nullable(),
  setId: uuid.optional().nullable(),
  questions: z.array(readingPassageQuestionSchema).min(1, 'Cần ít nhất 1 câu hỏi').max(20),
});
export type ReadingPassageInput = z.infer<typeof readingPassageSchema>;

export const readingPassageSetSchema = z.object({
  name: z.string().trim().min(1, 'Tên set là bắt buộc').max(100),
});
export type ReadingPassageSetInput = z.infer<typeof readingPassageSetSchema>;

// Kept for the retired feature components while their routes redirect. These
// are not used by the current learning experience.
const score = z.number().int().min(0).max(1000).optional().nullable();

export const mockTestResultSchema = z.object({
  testDate: isoDate,
  vocabGrammarScore: score,
  readingScore: score,
  listeningScore: score,
  totalScore: score,
});
export type MockTestResultInput = z.infer<typeof mockTestResultSchema>;

export const examDateSchema = z.object({
  examDate: isoDate.optional().nullable(),
});
export type ExamDateInput = z.infer<typeof examDateSchema>;

export const mistakeSchema = z.object({
  content: z.string().trim().min(1, 'Nội dung là bắt buộc').max(2000),
  linkedVocabId: uuid.optional().nullable(),
  linkedGrammarId: uuid.optional().nullable(),
});
export type MistakeInput = z.infer<typeof mistakeSchema>;

// ---------------------------------------------------------------------------
// Admin reference-data CRUD (T090-T092 — global vocab_entries/grammar_points
// rows where user_id IS NULL, and grammar_confusable_pairs). Reachable only
// via app/api/admin/reference-data/** using the service-role client
// (data-model.md RLS Summary: no authenticated-role write policy exists for
// these rows by design). `vocabEntrySchema` above already matches the global
// vocab field set exactly, so it's reused as-is for admin vocab create/update
// rather than duplicated.
// ---------------------------------------------------------------------------

export const grammarPointSchema = z.object({
  pattern: z.string().trim().min(1, 'Mẫu câu là bắt buộc').max(200),
  meaning: z.string().trim().min(1, 'Nghĩa là bắt buộc').max(1000),
  connectionForm: z.string().trim().max(500).optional().nullable(),
  formalityNuance: z.string().trim().max(1000).optional().nullable(),
  exampleSentences: z
    .array(z.string().trim().min(1).max(500))
    .max(20)
    .optional()
    .default([]),
  jlptLevel: z.string().trim().max(10).optional().default('N2'),
  frequencyTag: z.string().trim().max(20).optional().nullable(),
  n3Overlap: z.boolean().optional().default(false),
});
export type GrammarPointInput = z.infer<typeof grammarPointSchema>;

export const confusablePairSchema = z.object({
  grammarPointIdA: uuid,
  grammarPointIdB: uuid,
  comparisonNote: z.string().trim().min(1, 'Ghi chú so sánh là bắt buộc').max(5000),
});
export type ConfusablePairInput = z.infer<typeof confusablePairSchema>;

// ---------------------------------------------------------------------------
// Habit tracker (habits — T004)
// ---------------------------------------------------------------------------

export const habitSchema = z.object({
  name: z.string().trim().min(1, 'Tên thói quen là bắt buộc').max(100),
});
export type HabitInput = z.infer<typeof habitSchema>;

// ---------------------------------------------------------------------------
// Appearance (user_appearance_preferences — T018, POST /api/appearance)
// ---------------------------------------------------------------------------

export const appearanceModeEnum = z.enum(['light', 'dark']);

export const appearanceSchema = z.object({
  mode: appearanceModeEnum.optional(),
  themeId: uuid.optional(),
});
export type AppearanceInput = z.infer<typeof appearanceSchema>;

// ---------------------------------------------------------------------------
// Admin theme CRUD (themes — T030, /api/admin/reference-data/themes)
// ---------------------------------------------------------------------------

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Cần một mã màu hex, ví dụ #0d9488');

export const themeSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(1, 'Slug là bắt buộc')
    .max(50)
    .regex(/^[a-z0-9-]+$/, 'Slug chỉ được chứa chữ thường, số và dấu gạch ngang'),
  name: z.string().trim().min(1, 'Tên là bắt buộc').max(100),
  sortOrder: z.number().int().min(0).optional().default(0),
  primaryLight: hexColor,
  primaryForegroundLight: hexColor,
  secondaryLight: hexColor,
  secondaryForegroundLight: hexColor,
  accentLight: hexColor,
  accentForegroundLight: hexColor,
  primaryDark: hexColor,
  primaryForegroundDark: hexColor,
  secondaryDark: hexColor,
  secondaryForegroundDark: hexColor,
  accentDark: hexColor,
  accentForegroundDark: hexColor,
});
export type ThemeInput = z.infer<typeof themeSchema>;
