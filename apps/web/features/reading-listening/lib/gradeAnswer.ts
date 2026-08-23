import type { PassageQuestion } from '../types';

/**
 * Pure grading state for one question — held as client-side component state,
 * never persisted (specs/004-reading-comprehension/research.md §4). A wrong
 * `isCorrect` on a question's first grading is the caller's cue to log a
 * Mistake Notebook entry; retries re-grade without re-logging.
 */
export interface AnswerState {
  chosenIndex: number | null;
  isCorrect: boolean | null;
}

export function gradeAnswer(question: PassageQuestion, chosenIndex: number): AnswerState {
  return { chosenIndex, isCorrect: chosenIndex === question.correctChoiceIndex };
}
