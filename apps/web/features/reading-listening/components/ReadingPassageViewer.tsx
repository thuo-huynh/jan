'use client';

import { useState } from 'react';
import { Check, RotateCcw, X } from 'lucide-react';
import { createClient } from '@/shared/supabase/client';
import { gradeAnswer, type AnswerState } from '../lib/gradeAnswer';
import { AttachTermToSrsButton } from './AttachTermToSrsButton';
import type { PassageQuestion, QuestionProgress, ReadingPassage } from '../types';

/**
 * Read + click-to-answer quiz for one passage (US1 read-only render, US2
 * grading/retry/Mistake-Notebook logging, US4 tappable vocab terms) — one
 * component because the three stories all operate on the same rendered
 * passage rather than being separable screens (specs/004-reading-comprehension
 * tasks.md Phase 3-6 notes).
 *
 * `progress`/`onProgressChange` hold each question's last-known answer at the
 * ReadingPassageBank level (backed by user_reading_question_progress), not
 * just local state — otherwise collapsing/reopening a passage (which
 * unmounts this component) or reloading the page would silently forget which
 * questions were already answered.
 */
interface ReadingPassageViewerProps {
  passage: ReadingPassage;
  progress: Record<string, QuestionProgress>;
  onProgressChange: (questionId: string, state: QuestionProgress) => void;
}

export function ReadingPassageViewer({ passage, progress, onProgressChange }: ReadingPassageViewerProps) {
  const [answers, setAnswers] = useState<Record<string, AnswerState>>(() => {
    const initial: Record<string, AnswerState> = {};
    for (const q of passage.questions) {
      const p = progress[q.id];
      initial[q.id] = p ? { chosenIndex: p.chosenIndex, isCorrect: p.isCorrect } : { chosenIndex: null, isCorrect: null };
    }
    return initial;
  });
  const [openTermKey, setOpenTermKey] = useState<string | null>(null);

  async function persistAnswer(questionId: string, chosenIndex: number, isCorrect: boolean) {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await supabase
      .from('user_reading_question_progress')
      .upsert(
        { user_id: user.id, question_id: questionId, chosen_choice_index: chosenIndex, is_correct: isCorrect },
        { onConflict: 'user_id,question_id' },
      );
  }

  async function logMistake(question: PassageQuestion, chosenIndex: number) {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('mistake_notebook').insert({
      user_id: user.id,
      source: 'reading_quiz',
      content: `${passage.title} — ${question.questionText} — chọn: "${question.choices[chosenIndex]}", đúng: "${question.choices[question.correctChoiceIndex]}"`,
    });
  }

  function handleAnswer(question: PassageQuestion, chosenIndex: number) {
    const graded = gradeAnswer(question, chosenIndex);
    const isCorrect = graded.isCorrect ?? false;
    // A question with no progress row yet has never been answered before, in this or any past
    // session — that's the only time a wrong answer should reach the Mistake Notebook.
    const alreadyAttemptedBefore = Boolean(progress[question.id]);

    setAnswers((prev) => ({ ...prev, [question.id]: graded }));
    onProgressChange(question.id, { chosenIndex, isCorrect });
    void persistAnswer(question.id, chosenIndex, isCorrect);
    if (!isCorrect && !alreadyAttemptedBefore) void logMistake(question, chosenIndex);
  }

  function handleRetry(questionId: string) {
    setAnswers((prev) => ({ ...prev, [questionId]: { chosenIndex: null, isCorrect: null } }));
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground">{passage.title}</h2>

      <div className="card whitespace-pre-wrap p-4 font-jp text-base leading-loose text-foreground">
        {passage.segments.map((segment, i) => {
          if (segment.type === 'text') return <span key={i}>{segment.value}</span>;
          const key = `term-${i}`;
          const open = openTermKey === key;
          return (
            <span key={i} className="relative inline-block">
              <button
                type="button"
                onClick={() => setOpenTermKey(open ? null : key)}
                onBlur={() => setTimeout(() => setOpenTermKey((k) => (k === key ? null : k)), 150)}
                className="border-b border-dashed border-primary/50 text-foreground transition-colors hover:bg-primary/10"
              >
                {segment.term}
              </button>
              {open && (
                <span
                  onMouseDown={(e) => e.preventDefault()}
                  className="absolute left-0 top-full z-10 mt-1 w-56 whitespace-normal rounded-lg border border-border bg-card p-3 text-sm normal-case shadow-lg"
                >
                  <span className="block font-jp text-foreground">{segment.reading || segment.term}</span>
                  <span className="mt-0.5 block text-muted-foreground">{segment.meaning}</span>
                  <span className="mt-2 block">
                    <AttachTermToSrsButton
                      term={segment.term}
                      reading={segment.reading}
                      meaning={segment.meaning}
                      readingPassageId={passage.id}
                    />
                  </span>
                </span>
              )}
            </span>
          );
        })}
      </div>

      <div className="space-y-3">
        {passage.questions.map((question, qIndex) => {
          const state = answers[question.id];
          const answered = state?.chosenIndex != null;

          return (
            <div key={question.id} className="card space-y-3 p-4">
              <p className="text-sm font-medium text-foreground">
                Câu {qIndex + 1}. {question.questionText}
              </p>
              <ol className="space-y-1.5">
                {question.choices.map((choice, i) => {
                  const isCorrectChoice = i === question.correctChoiceIndex;
                  const isChosenWrong = answered && i === state?.chosenIndex && !isCorrectChoice;
                  return (
                    <li key={i}>
                      <button
                        type="button"
                        disabled={answered}
                        onClick={() => handleAnswer(question, i)}
                        style={
                          answered && isCorrectChoice
                            ? { backgroundColor: 'color-mix(in srgb, var(--success) 12%, transparent)' }
                            : isChosenWrong
                              ? { backgroundColor: 'color-mix(in srgb, var(--danger) 12%, transparent)' }
                              : undefined
                        }
                        className={`flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors disabled:cursor-not-allowed ${
                          answered && isCorrectChoice
                            ? 'border-success font-medium text-success'
                            : isChosenWrong
                              ? 'border-danger font-medium text-danger'
                              : answered
                                ? 'border-border text-muted-foreground opacity-60'
                                : 'border-border text-foreground hover:bg-muted'
                        }`}
                      >
                        <span>{choice}</span>
                        {answered && isCorrectChoice && <Check className="h-4 w-4 shrink-0" aria-hidden="true" />}
                        {isChosenWrong && <X className="h-4 w-4 shrink-0" aria-hidden="true" />}
                      </button>
                    </li>
                  );
                })}
              </ol>

              {answered && (
                <>
                  <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
                    <p className="mb-1 text-xs font-semibold text-foreground">Giải thích</p>
                    {question.explanation}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRetry(question.id)}
                    className="btn-ghost h-8 px-2 text-xs"
                  >
                    <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                    Làm lại
                  </button>
                </>
              )}
            </div>
          );
        })}
      </div>

      {passage.translationVn && (
        <div className="card p-4">
          <p className="mb-1 text-sm font-semibold text-foreground">Bản dịch</p>
          <p className="text-sm text-muted-foreground">{passage.translationVn}</p>
        </div>
      )}

      {passage.tip && (
        <div className="card p-4">
          <p className="mb-1 text-sm font-semibold text-foreground">Mẹo làm bài</p>
          <p className="text-sm text-muted-foreground">{passage.tip}</p>
        </div>
      )}
    </div>
  );
}
