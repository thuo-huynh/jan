import type { PassageQuestion, PassageSegment, ReadingPassage } from '../types';

/** Shape of a row selected from `reading_passages` (snake_case, as returned by Supabase). */
export interface ReadingPassageRecord {
  id: string;
  set_id: string | null;
  title: string;
  passage_segments: PassageSegment[];
  translation_vn: string | null;
  tip: string | null;
}

/** Shape of a row selected from `reading_passage_questions`. */
export interface ReadingPassageQuestionRecord {
  id: string;
  passage_id: string;
  order_index: number;
  question_text: string;
  choices: string[];
  correct_choice_index: number;
  explanation: string;
}

/**
 * Combines a `reading_passages` row with its `reading_passage_questions` rows
 * into the camelCase shape components use — same row->prop split as
 * `mapGrammarPoint.ts`, so components never touch snake_case Supabase rows
 * directly.
 */
export function mapReadingPassage(
  passage: ReadingPassageRecord,
  questions: ReadingPassageQuestionRecord[],
): ReadingPassage {
  return {
    id: passage.id,
    setId: passage.set_id,
    title: passage.title,
    segments: passage.passage_segments,
    translationVn: passage.translation_vn,
    tip: passage.tip,
    questions: questions
      .filter((q) => q.passage_id === passage.id)
      .sort((a, b) => a.order_index - b.order_index)
      .map(
        (q): PassageQuestion => ({
          id: q.id,
          orderIndex: q.order_index,
          questionText: q.question_text,
          choices: q.choices,
          correctChoiceIndex: q.correct_choice_index,
          explanation: q.explanation,
        }),
      ),
  };
}
