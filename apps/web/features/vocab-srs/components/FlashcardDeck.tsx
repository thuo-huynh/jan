'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, ChevronLeft, ChevronRight, RotateCcw, Shuffle } from 'lucide-react';

/**
 * Quizlet-style free-flip flashcard study mode — click/Space to flip,
 * arrow keys or buttons to move through the deck, optional shuffle. No
 * grading and nothing is persisted; this is a casual browse/self-check
 * companion to the graded SM2 review session at /learn/review, not a
 * replacement for it.
 */
export interface FlashcardItem {
  id: string;
  word: string;
  reading: string | null;
  meaning: string;
  example: string | null;
  isKanji: boolean;
  source: 'custom' | 'global';
}

interface FlashcardDeckProps {
  cards: FlashcardItem[];
}

function shuffledIndices(length: number): number[] {
  const indices = Array.from({ length }, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return indices;
}

export function FlashcardDeck({ cards }: FlashcardDeckProps) {
  const [order, setOrder] = useState(() => cards.map((_, i) => i));
  const [position, setPosition] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const done = position >= order.length;
  const current = done ? null : cards[order[position]];

  function goNext() {
    setFlipped(false);
    setPosition((p) => Math.min(p + 1, order.length));
  }

  function goPrev() {
    if (position === 0) return;
    setFlipped(false);
    setPosition((p) => p - 1);
  }

  function restart(reshuffle: boolean) {
    setOrder(reshuffle ? shuffledIndices(cards.length) : cards.map((_, i) => i));
    setPosition(0);
    setFlipped(false);
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey || done) return;
      if (event.key === ' ' || event.key === 'Enter') {
        event.preventDefault();
        setFlipped((f) => !f);
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        goNext();
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        goPrev();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done, position, order.length]);

  const progressLabel = useMemo(
    () => (done ? `${order.length} / ${order.length}` : `${position + 1} / ${order.length}`),
    [done, position, order.length],
  );

  if (cards.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border p-10 text-center">
        <p className="max-w-xs text-sm text-muted-foreground">No cards match this filter.</p>
        <Link href="/learn/vocab" className="text-sm font-medium text-primary hover:opacity-80">
          Back to vocab deck
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="card space-y-4 p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
          <CheckCircle2 className="h-6 w-6 text-success" aria-hidden="true" />
        </div>
        <div>
          <p className="text-lg font-semibold text-foreground">Deck complete</p>
          <p className="mt-1 text-sm text-muted-foreground">
            You went through all {order.length} card{order.length === 1 ? '' : 's'}.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          <button type="button" onClick={() => restart(false)} className="btn-outline">
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Restart
          </button>
          <button type="button" onClick={() => restart(true)} className="btn-primary">
            <Shuffle className="h-4 w-4" aria-hidden="true" />
            Restart shuffled
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{progressLabel}</span>
        <button
          type="button"
          onClick={() => restart(true)}
          className="flex items-center gap-1 font-medium text-primary hover:opacity-80"
        >
          <Shuffle className="h-3.5 w-3.5" aria-hidden="true" />
          Shuffle
        </button>
      </div>

      <div className="flashcard-perspective h-64 sm:h-72">
        <div
          className={`flashcard-inner ${flipped ? 'is-flipped' : ''}`}
          onClick={() => setFlipped((f) => !f)}
          role="button"
          tabIndex={0}
          aria-label={flipped ? 'Showing meaning — click to flip back' : 'Showing word — click to reveal meaning'}
          onKeyDown={(e) => {
            if (e.key === ' ' || e.key === 'Enter') e.preventDefault();
          }}
        >
          <div className="flashcard-face card flex cursor-pointer flex-col items-center justify-center gap-2 p-6 text-center">
            <span className="badge-neutral">{current!.source === 'custom' ? 'custom' : 'N2'}</span>
            <p className="font-jp text-4xl text-foreground">{current!.word}</p>
            <p className="text-xs text-muted-foreground">Click or press Space to flip</p>
          </div>
          <div className="flashcard-face flashcard-face-back card flex cursor-pointer flex-col items-center justify-center gap-2 p-6 text-center">
            {current!.reading && <p className="font-jp text-lg text-muted-foreground">{current!.reading}</p>}
            <p className="text-lg font-medium text-foreground">{current!.meaning}</p>
            {current!.example && <p className="font-jp text-sm text-muted-foreground">{current!.example}</p>}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={goPrev}
          disabled={position === 0}
          className="btn-outline"
          aria-label="Previous card"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          Prev
        </button>
        <button type="button" onClick={goNext} className="btn-primary flex-1" aria-label="Next card">
          Next
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
