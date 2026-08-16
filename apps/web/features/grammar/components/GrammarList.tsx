'use client';

import { useMemo, useState } from 'react';
import type { GrammarPointWithProgress, GrammarStatus } from '../types';
import { GrammarPointRow } from './GrammarPointRow';

interface GrammarListProps {
  points: GrammarPointWithProgress[];
  userId: string;
}

/**
 * Client-side list wrapper for the grammar tracker page (T041): owns the
 * N3-level-diff filter toggle (T045) and the "lifted" copy of each point's
 * status/note so the mastery-progress summary stays in sync when a row
 * mutates without a full page reload. Filtering happens client-side over
 * the already-fetched (~96-row) dataset rather than a route round-trip.
 */
export function GrammarList({ points: initialPoints, userId }: GrammarListProps) {
  const [points, setPoints] = useState(initialPoints);
  const [hideN3Overlap, setHideN3Overlap] = useState(false);

  const counts = useMemo(() => {
    return points.reduce(
      (acc, p) => {
        acc[p.status] += 1;
        return acc;
      },
      { not_started: 0, learning: 0, mastered: 0 } as Record<GrammarStatus, number>,
    );
  }, [points]);

  const visiblePoints = useMemo(
    () => (hideN3Overlap ? points.filter((p) => !p.n3Overlap) : points),
    [points, hideN3Overlap],
  );

  function handleStatusChange(pointId: string, status: GrammarStatus) {
    setPoints((prev) => prev.map((p) => (p.id === pointId ? { ...p, status } : p)));
  }

  function handleNoteChange(pointId: string, notesUser: string | null) {
    setPoints((prev) => prev.map((p) => (p.id === pointId ? { ...p, notesUser } : p)));
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-4">
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <span className="font-medium text-foreground">{points.length} grammar points</span>
          <span className="text-success">{counts.mastered} mastered</span>
          <span className="text-warning">{counts.learning} learning</span>
          <span className="text-muted-foreground">{counts.not_started} not started</span>
        </div>
        <label className="flex cursor-pointer select-none items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            checked={hideN3Overlap}
            onChange={(e) => setHideN3Overlap(e.target.checked)}
            className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
          />
          Hide N3-level material
        </label>
      </div>

      {visiblePoints.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          No grammar points match the current filter.
        </div>
      ) : (
        <ul className="space-y-3">
          {visiblePoints.map((point) => (
            <li key={point.id}>
              <GrammarPointRow
                point={point}
                userId={userId}
                onStatusChange={handleStatusChange}
                onNoteChange={handleNoteChange}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
