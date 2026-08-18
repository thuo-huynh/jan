'use client';

import { useEffect, useState } from 'react';

/**
 * Review card (T054/T055) — supports both review directions required by
 * FR-020: reading→meaning for regular vocab, and kanji recognition /
 * writing-recall for `is_kanji` items (user picks the mode per card before
 * revealing). Grading buttons (again/hard/good/easy) use the `srs-*` design
 * tokens (DESIGN.md) and POST to /api/reviews via the parent's `onGraded`.
 *
 * Keyboard shortcuts (Space/Enter to reveal, 1-4 to grade) matter more here
 * than almost anywhere else in the app — a review session is dozens of reps
 * of the same two actions, so forcing a mouse trip to a button every card
 * adds up fast. Standard Anki-style bindings.
 */

export type ReviewResult = 'again' | 'hard' | 'good' | 'easy';
type KanjiMode = 'kanji_recognition' | 'kanji_writing_recall';

export interface ReviewQueueItem {
  itemType: 'vocab' | 'grammar';
  itemId: string;
  dueDate: string;
  isKanji?: boolean;
  isCustom?: boolean;
  isWeak?: boolean;
  word?: string;
  reading?: string | null;
  meaning?: string;
  example?: string | null;
  jlptLevel?: string | null;
  pattern?: string;
  connectionForm?: string | null;
  formalityNuance?: string | null;
  exampleSentences?: string[];
  frequencyTag?: string | null;
}

interface ReviewCardProps {
  item: ReviewQueueItem;
  onGraded: (result: ReviewResult, direction?: string) => Promise<void> | void;
}

const GRADE_BUTTONS: { result: ReviewResult; label: string; className: string }[] = [
  { result: 'again', label: 'Again', className: 'bg-srs-again' },
  { result: 'hard', label: 'Hard', className: 'bg-srs-hard' },
  { result: 'good', label: 'Good', className: 'bg-srs-good' },
  { result: 'easy', label: 'Easy', className: 'bg-srs-easy' },
];

export function ReviewCard({ item, onGraded }: ReviewCardProps) {
  const [revealed, setRevealed] = useState(false);
  const [kanjiMode, setKanjiMode] = useState<KanjiMode>('kanji_recognition');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const direction =
    item.itemType === 'vocab' ? (item.isKanji ? kanjiMode : 'reading_to_meaning') : undefined;

  async function grade(result: ReviewResult) {
    setSubmitting(true);
    setError(null);
    try {
      await onGraded(result, direction);
      // On success the parent swaps to the next queue item, which changes
      // this component's `key` and remounts it with fresh state — no local
      // reset needed here.
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit review');
      setSubmitting(false);
    }
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      if (!revealed) {
        if (event.key === ' ' || event.key === 'Enter') {
          event.preventDefault();
          setRevealed(true);
        }
        return;
      }

      if (submitting) return;
      const GRADE_KEYS: Record<string, ReviewResult> = {
        '1': 'again',
        '2': 'hard',
        '3': 'good',
        '4': 'easy',
      };
      const result = GRADE_KEYS[event.key];
      if (result) {
        event.preventDefault();
        grade(result);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealed, submitting]);

  return (
    <div className="card space-y-4 p-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="badge-neutral">
            {item.itemType === 'vocab' ? (item.isCustom ? 'custom' : 'N2') : 'grammar'}
            {item.itemType === 'vocab' && item.isKanji ? ' · kanji' : ''}
          </span>
          {item.isWeak && <span className="badge-danger">weak</span>}
        </div>
        {item.itemType === 'vocab' && item.isKanji && !revealed && (
          <div className="flex gap-1 text-xs">
            <button
              type="button"
              onClick={() => setKanjiMode('kanji_recognition')}
              className={`rounded px-2 py-1 font-medium transition-colors ${
                kanjiMode === 'kanji_recognition'
                  ? 'bg-primary text-primary-foreground'
                  : 'border border-border text-muted-foreground hover:bg-muted'
              }`}
            >
              Recognition
            </button>
            <button
              type="button"
              onClick={() => setKanjiMode('kanji_writing_recall')}
              className={`rounded px-2 py-1 font-medium transition-colors ${
                kanjiMode === 'kanji_writing_recall'
                  ? 'bg-primary text-primary-foreground'
                  : 'border border-border text-muted-foreground hover:bg-muted'
              }`}
            >
              Writing recall
            </button>
          </div>
        )}
      </div>

      <div className="flex min-h-[10rem] flex-col items-center justify-center text-center">
        <CardFace item={item} kanjiMode={kanjiMode} revealed={revealed} />
      </div>

      {error && <p className="error-text text-center">{error}</p>}

      {!revealed ? (
        <button type="button" onClick={() => setRevealed(true)} className="btn-outline w-full">
          Show answer
          <span className="ml-1.5 text-xs text-muted-foreground">(Space)</span>
        </button>
      ) : (
        <div className="grid grid-cols-4 gap-2">
          {GRADE_BUTTONS.map((btn, i) => (
            <button
              key={btn.result}
              type="button"
              disabled={submitting}
              onClick={() => grade(btn.result)}
              className={`rounded px-3 py-2 text-sm font-semibold text-white transition-colors hover:opacity-90 disabled:opacity-60 ${btn.className}`}
            >
              {btn.label}
              <span className="ml-1 opacity-75">({i + 1})</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function CardFace({
  item,
  kanjiMode,
  revealed,
}: {
  item: ReviewQueueItem;
  kanjiMode: KanjiMode;
  revealed: boolean;
}) {
  if (item.itemType === 'grammar') {
    return (
      <div className="space-y-3">
        <p className="font-jp text-3xl text-foreground">{item.pattern}</p>
        {revealed ? (
          <div className="space-y-2 text-left">
            <p className="text-foreground">{item.meaning}</p>
            {item.connectionForm && (
              <p className="text-sm text-muted-foreground">接続: {item.connectionForm}</p>
            )}
            {item.formalityNuance && (
              <p className="text-sm text-muted-foreground">{item.formalityNuance}</p>
            )}
            {item.exampleSentences?.map((sentence, i) => (
              <p key={i} className="font-jp text-sm text-muted-foreground">
                {sentence}
              </p>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Recall the meaning and connection form.</p>
        )}
      </div>
    );
  }

  // Vocab / kanji items.
  if (item.isKanji) {
    const recognitionMode = kanjiMode === 'kanji_recognition';
    return (
      <div className="space-y-3">
        {recognitionMode ? (
          <>
            <p className="font-jp text-6xl text-foreground">{item.word}</p>
            {revealed ? (
              <div className="space-y-1">
                <p className="font-jp text-lg text-muted-foreground">{item.reading}</p>
                <p className="text-foreground">{item.meaning}</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Recall the reading and meaning.</p>
            )}
          </>
        ) : (
          <>
            <p className="text-foreground">{item.meaning}</p>
            {item.reading && (
              <p className="font-jp text-lg text-muted-foreground">{item.reading}</p>
            )}
            {revealed ? (
              <p className="font-jp text-6xl text-foreground">{item.word}</p>
            ) : (
              <p className="text-sm text-muted-foreground">Recall the kanji form.</p>
            )}
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="font-jp text-4xl text-foreground">{item.word}</p>
      {item.reading && <p className="font-jp text-lg text-muted-foreground">{item.reading}</p>}
      {revealed ? (
        <div className="space-y-1">
          <p className="text-foreground">{item.meaning}</p>
          {item.example && <p className="font-jp text-sm text-muted-foreground">{item.example}</p>}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Recall the meaning.</p>
      )}
    </div>
  );
}
