'use client';

import { useMemo, useState } from 'react';
import { ArrowLeftRight, Search, SearchX, X } from 'lucide-react';
import type { GrammarPointWithProgress, GrammarStatus } from '../types';
import { GrammarPointRow } from './GrammarPointRow';

interface GrammarListProps {
  points: GrammarPointWithProgress[];
  userId: string;
}

/**
 * Client-side list wrapper for the grammar tracker page (T041): owns the
 * N3-level-diff filter toggle (T045), a pattern/meaning text search (needed
 * once the catalog is ~100-200 points — status/level filters alone don't
 * get you to a specific point like として quickly), an "only confusable
 * pairs" toggle so that first-class feature is discoverable from the list
 * itself rather than only stumbled into row-by-row, and the "lifted" copy
 * of each point's status/note so the mastery-progress summary stays in
 * sync when a row mutates without a full page reload. Filtering happens
 * client-side over the already-fetched (~96-row) dataset rather than a
 * route round-trip.
 */
export function GrammarList({ points: initialPoints, userId }: GrammarListProps) {
  const [points, setPoints] = useState(initialPoints);
  const [hideN3Overlap, setHideN3Overlap] = useState(false);
  const [onlyConfusable, setOnlyConfusable] = useState(false);
  const [query, setQuery] = useState('');

  const counts = useMemo(() => {
    return points.reduce(
      (acc, p) => {
        acc[p.status] += 1;
        return acc;
      },
      { not_started: 0, learning: 0, mastered: 0 } as Record<GrammarStatus, number>,
    );
  }, [points]);

  const confusablePairCount = useMemo(
    () => new Set(points.flatMap((p) => p.confusablePairs.map((cp) => cp.pairId))).size,
    [points],
  );

  const visiblePoints = useMemo(() => {
    let list = points;
    if (hideN3Overlap) list = list.filter((p) => !p.n3Overlap);
    if (onlyConfusable) list = list.filter((p) => p.confusablePairs.length > 0);
    const q = query.trim().toLowerCase();
    if (q) list = list.filter((p) => p.pattern.toLowerCase().includes(q) || p.meaning.toLowerCase().includes(q));
    return list;
  }, [points, hideN3Overlap, onlyConfusable, query]);

  const hasActiveFilter = hideN3Overlap || onlyConfusable || query.trim().length > 0;

  function handleStatusChange(pointId: string, status: GrammarStatus) {
    setPoints((prev) => prev.map((p) => (p.id === pointId ? { ...p, status } : p)));
  }

  function handleNoteChange(pointId: string, notesUser: string | null) {
    setPoints((prev) => prev.map((p) => (p.id === pointId ? { ...p, notesUser } : p)));
  }

  return (
    <div className="space-y-4">
      <div className="card space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-medium text-foreground">{points.length} điểm ngữ pháp</span>
          <span className="badge-success">{counts.mastered} đã thuộc</span>
          <span className="badge-warning">{counts.learning} đang học</span>
          <span className="badge-neutral">{counts.not_started} chưa học</span>
          {confusablePairCount > 0 && (
            <button
              type="button"
              onClick={() => setOnlyConfusable((v) => !v)}
              aria-pressed={onlyConfusable}
              title="Chỉ hiện các điểm thuộc một cặp dễ nhầm"
              className={`badge-primary transition-colors ${onlyConfusable ? 'ring-1 ring-primary' : 'hover:opacity-80'}`}
            >
              <ArrowLeftRight className="h-3 w-3" aria-hidden="true" />
              {confusablePairCount} cặp dễ nhầm
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[12rem] flex-1">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm theo mẫu ngữ pháp hoặc nghĩa (vd: として)…"
              aria-label="Tìm điểm ngữ pháp"
              className="input-field h-9 pl-8"
            />
          </div>
          <label className="flex cursor-pointer select-none items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={hideN3Overlap}
              onChange={(e) => setHideN3Overlap(e.target.checked)}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
            />
            Ẩn nội dung trình độ N3
          </label>
          {hasActiveFilter && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setHideN3Overlap(false);
                setOnlyConfusable(false);
              }}
              className="btn-ghost h-9 px-2.5 text-xs"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
              Xóa bộ lọc
            </button>
          )}
        </div>
      </div>

      {visiblePoints.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border p-10 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <SearchX className="h-6 w-6 text-primary" aria-hidden="true" />
          </div>
          <p className="max-w-xs text-sm text-muted-foreground">
            Không có điểm ngữ pháp nào khớp với tìm kiếm/bộ lọc. Thử xóa bộ lọc ở trên.
          </p>
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
