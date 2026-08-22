'use client';

import { useState } from 'react';
import type { GrammarPointWithProgress, GrammarStatus } from '../types';
import { GrammarMarkdown } from './GrammarMarkdown';
import { GrammarPointRow } from './GrammarPointRow';

interface ConfusablePairCardProps {
  pointA: GrammarPointWithProgress;
  pointB: GrammarPointWithProgress;
  comparisonNote: string;
  userId: string;
}

/**
 * Side-by-side confusable-pair comparison (T047). Reuses `GrammarPointRow`
 * for each side so status/notes stay fully functional from the comparison
 * view too, which needs local state here (a Server Component parent can't
 * pass the row's callback props across the RSC boundary) — kept in sync the
 * same lifted-state way as `GrammarList`. `comparison_note` is rendered via
 * the shared sanitized markdown renderer (T047's markdown requirement).
 */
export function ConfusablePairCard({
  pointA: initialA,
  pointB: initialB,
  comparisonNote,
  userId,
}: ConfusablePairCardProps) {
  const [pointA, setPointA] = useState(initialA);
  const [pointB, setPointB] = useState(initialB);

  function makeStatusHandler(setter: typeof setPointA) {
    return (pointId: string, status: GrammarStatus) => {
      setter((prev) => (prev.id === pointId ? { ...prev, status } : prev));
    };
  }

  function makeNoteHandler(setter: typeof setPointA) {
    return (pointId: string, notesUser: string | null) => {
      setter((prev) => (prev.id === pointId ? { ...prev, notesUser } : prev));
    };
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <GrammarPointRow
          point={pointA}
          userId={userId}
          onStatusChange={makeStatusHandler(setPointA)}
          onNoteChange={makeNoteHandler(setPointA)}
        />
        <GrammarPointRow
          point={pointB}
          userId={userId}
          onStatusChange={makeStatusHandler(setPointB)}
          onNoteChange={makeNoteHandler(setPointB)}
        />
      </div>

      <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
        <h2 className="mb-2 text-sm font-semibold text-primary">Phân biệt</h2>
        <GrammarMarkdown>{comparisonNote}</GrammarMarkdown>
      </div>
    </div>
  );
}
