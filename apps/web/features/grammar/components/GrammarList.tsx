'use client';

import { useMemo, useState } from 'react';
import { ArrowLeftRight, BookOpen, FileCode2, Pencil, Plus, Search, SearchX, Trash2, X } from 'lucide-react';
import { createClient } from '@/shared/supabase/client';
import { useConfirm } from '@/shared/hooks/useConfirm';
import { mapGrammarPoint, type GrammarPointRecord } from '../lib/mapGrammarPoint';
import type { GrammarPointWithProgress, GrammarSet, GrammarStatus } from '../types';
import { GrammarHtmlImportForm } from './GrammarHtmlImportForm';
import { GrammarPointForm, type GrammarPointFormValues } from './GrammarPointForm';
import { GrammarPointRow } from './GrammarPointRow';

interface GrammarListProps {
  points: GrammarPointWithProgress[];
  userId: string;
  initialSets: GrammarSet[];
}

/**
 * Client-side list wrapper for the grammar tracker page (T041): owns the
 * level filter, a set filter (grammar_sets, 0025_grammar_sets.sql — only
 * ever matches the caller's own custom points, since global catalog points
 * never belong to a set), a pattern/meaning text search (needed once the
 * catalog is ~100-200 points — status/level filters alone don't get you to
 * a specific point like として quickly), an "only confusable pairs" toggle
 * so that first-class feature is discoverable from the list itself rather
 * than only stumbled into row-by-row, the "lifted" copy of each point's
 * status/note so the mastery-progress summary stays in sync when a row
 * mutates without a full page reload, and the caller's own custom-point
 * add/edit/delete flow (GrammarPointForm + GrammarHtmlImportForm).
 * Filtering happens client-side over the already-fetched (~96-row) dataset
 * rather than a route round-trip.
 */
export function GrammarList({ points: initialPoints, userId, initialSets }: GrammarListProps) {
  const [points, setPoints] = useState(initialPoints);
  const [sets, setSets] = useState(initialSets);
  const [levelFilter, setLevelFilter] = useState('');
  const [setFilter, setSetFilter] = useState('');
  const [onlyConfusable, setOnlyConfusable] = useState(false);
  const [query, setQuery] = useState('');
  const [addMode, setAddMode] = useState<'none' | 'single' | 'html'>('none');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [renamingSet, setRenamingSet] = useState(false);
  const [renameDraft, setRenameDraft] = useState('');
  const [setError, setSetError] = useState<string | null>(null);
  const { confirm, confirmDialog } = useConfirm();

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

  const levelOptions = useMemo(() => Array.from(new Set(points.map((p) => p.jlptLevel))).sort(), [points]);

  const setNameById = useMemo(() => new Map(sets.map((s) => [s.id, s.name])), [sets]);

  const visiblePoints = useMemo(() => {
    let list = points;
    if (levelFilter) list = list.filter((p) => p.jlptLevel === levelFilter);
    if (setFilter) list = list.filter((p) => p.setId === setFilter);
    if (onlyConfusable) list = list.filter((p) => p.confusablePairs.length > 0);
    const q = query.trim().toLowerCase();
    if (q) list = list.filter((p) => p.pattern.toLowerCase().includes(q) || p.meaning.toLowerCase().includes(q));
    return list;
  }, [points, levelFilter, setFilter, onlyConfusable, query]);

  const hasActiveFilter = levelFilter !== '' || setFilter !== '' || onlyConfusable || query.trim().length > 0;
  const selectedSet = setFilter ? sets.find((s) => s.id === setFilter) : undefined;

  function handleStatusChange(pointId: string, status: GrammarStatus) {
    setPoints((prev) => prev.map((p) => (p.id === pointId ? { ...p, status } : p)));
  }

  function handleNoteChange(pointId: string, notesUser: string | null) {
    setPoints((prev) => prev.map((p) => (p.id === pointId ? { ...p, notesUser } : p)));
  }

  function handleSetCreated(set: GrammarSet) {
    setSets((prev) => (prev.some((s) => s.id === set.id) ? prev : [...prev, set]));
  }

  function handleCreated(row: GrammarPointRecord) {
    setPoints((prev) => [mapGrammarPoint(row, undefined, []), ...prev]);
    setAddMode('none');
  }

  function handleImported(rows: GrammarPointRecord[]) {
    setPoints((prev) => [...rows.map((row) => mapGrammarPoint(row, undefined, [])), ...prev]);
  }

  function handleUpdated(row: GrammarPointRecord) {
    setPoints((prev) =>
      prev.map((p) => (p.id === row.id ? mapGrammarPoint(row, toStatusRecord(p), p.confusablePairs) : p)),
    );
    setEditingId(null);
  }

  function handleDeleted(pointId: string) {
    setPoints((prev) => prev.filter((p) => p.id !== pointId));
  }

  async function handleRenameSet() {
    const name = renameDraft.trim();
    if (!name || !selectedSet) {
      setRenamingSet(false);
      return;
    }
    const supabase = createClient();
    const { error } = await supabase.from('grammar_sets').update({ name }).eq('id', selectedSet.id);
    if (!error) {
      setSets((prev) => prev.map((s) => (s.id === selectedSet.id ? { ...s, name } : s)));
    } else {
      setSetError(error.message);
    }
    setRenamingSet(false);
  }

  async function handleDeleteSet() {
    if (!selectedSet) return;
    const count = points.filter((p) => p.setId === selectedSet.id).length;
    const ok = await confirm({
      title: `Xóa set "${selectedSet.name}"?`,
      description:
        count > 0
          ? `${count} điểm ngữ pháp trong set sẽ không bị xóa, chỉ mất nhóm (chuyển vào không thuộc set nào).`
          : undefined,
    });
    if (!ok) return;
    const supabase = createClient();
    const { error } = await supabase.from('grammar_sets').delete().eq('id', selectedSet.id);
    if (error) {
      setSetError(error.message);
      return;
    }
    setSets((prev) => prev.filter((s) => s.id !== selectedSet.id));
    setPoints((prev) => prev.map((p) => (p.setId === selectedSet.id ? { ...p, setId: null } : p)));
    setSetFilter('');
  }

  return (
    <div className="space-y-4">
      {confirmDialog}
      <div className="card space-y-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
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
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setAddMode((m) => (m === 'html' ? 'none' : 'html'))}
              className="btn-outline h-9 px-3 text-sm"
            >
              {addMode === 'html' ? (
                <>
                  <X className="h-4 w-4" aria-hidden="true" />
                  Đóng
                </>
              ) : (
                <>
                  <FileCode2 className="h-4 w-4" aria-hidden="true" />
                  Nhập từ HTML
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => setAddMode((m) => (m === 'single' ? 'none' : 'single'))}
              className="btn-primary h-9 px-3 text-sm"
            >
              {addMode === 'single' ? (
                <>
                  <X className="h-4 w-4" aria-hidden="true" />
                  Đóng
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Thêm điểm ngữ pháp
                </>
              )}
            </button>
          </div>
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
          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            aria-label="Lọc theo cấp độ JLPT"
            className="input-field h-9 w-auto"
          >
            <option value="">Tất cả cấp độ</option>
            {levelOptions.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
          {sets.length > 0 && (
            <select
              value={setFilter}
              onChange={(e) => setSetFilter(e.target.value)}
              aria-label="Lọc theo set"
              className="input-field h-9 w-auto"
            >
              <option value="">Tất cả set</option>
              {sets.map((set) => (
                <option key={set.id} value={set.id}>
                  {set.name}
                </option>
              ))}
            </select>
          )}
          {selectedSet &&
            (renamingSet ? (
              <input
                autoFocus
                value={renameDraft}
                onChange={(e) => setRenameDraft(e.target.value)}
                onBlur={handleRenameSet}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRenameSet();
                  if (e.key === 'Escape') setRenamingSet(false);
                }}
                className="input-field h-9 w-40"
              />
            ) : (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setRenamingSet(true);
                    setRenameDraft(selectedSet.name);
                  }}
                  aria-label={`Đổi tên set ${selectedSet.name}`}
                  className="flex h-9 w-9 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={handleDeleteSet}
                  aria-label={`Xóa set ${selectedSet.name}`}
                  className="flex h-9 w-9 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-danger/10 hover:text-danger"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            ))}
          {hasActiveFilter && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setLevelFilter('');
                setSetFilter('');
                setOnlyConfusable(false);
              }}
              className="btn-ghost h-9 px-2.5 text-xs"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
              Xóa bộ lọc
            </button>
          )}
        </div>
        {setError && <p className="error-text">{setError}</p>}
      </div>

      {addMode === 'single' && (
        <GrammarPointForm
          mode="create"
          sets={sets}
          onSetCreated={handleSetCreated}
          onSaved={handleCreated}
          onCancel={() => setAddMode('none')}
        />
      )}
      {addMode === 'html' && (
        <GrammarHtmlImportForm
          existingPatterns={points.map((p) => p.pattern)}
          existingSets={sets}
          onSetCreated={handleSetCreated}
          onImported={handleImported}
          onCancel={() => setAddMode('none')}
        />
      )}

      {visiblePoints.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border p-10 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            {points.length === 0 ? (
              <BookOpen className="h-6 w-6 text-primary" aria-hidden="true" />
            ) : (
              <SearchX className="h-6 w-6 text-primary" aria-hidden="true" />
            )}
          </div>
          <p className="max-w-xs text-sm text-muted-foreground">
            {points.length === 0
              ? 'Chưa có điểm ngữ pháp nào — dùng nút "Thêm điểm ngữ pháp" hoặc "Nhập từ HTML" ở trên để bắt đầu.'
              : 'Không có điểm ngữ pháp nào khớp với tìm kiếm/bộ lọc. Thử xóa bộ lọc ở trên.'}
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {visiblePoints.map((point) =>
            editingId === point.id ? (
              <li key={point.id}>
                <GrammarPointForm
                  mode="edit"
                  pointId={point.id}
                  initialValues={toFormValues(point)}
                  sets={sets}
                  onSetCreated={handleSetCreated}
                  onSaved={handleUpdated}
                  onCancel={() => setEditingId(null)}
                />
              </li>
            ) : (
              <li key={point.id}>
                <GrammarPointRow
                  point={point}
                  userId={userId}
                  setName={point.setId ? (setNameById.get(point.setId) ?? null) : null}
                  onStatusChange={handleStatusChange}
                  onNoteChange={handleNoteChange}
                  onEdit={point.isCustom ? setEditingId : undefined}
                  onDeleted={point.isCustom ? handleDeleted : undefined}
                />
              </li>
            ),
          )}
        </ul>
      )}
    </div>
  );
}

/** Rebuilds the `user_grammar_status`-shaped input `mapGrammarPoint` expects, from an already-mapped point, so editing a point's content fields doesn't disturb its status/note. */
function toStatusRecord(point: GrammarPointWithProgress) {
  return { grammar_point_id: point.id, status: point.status, notes_user: point.notesUser };
}

function toFormValues(point: GrammarPointWithProgress): GrammarPointFormValues {
  return {
    pattern: point.pattern,
    connectionForm: point.connectionForm ?? '',
    meaning: point.meaning,
    formalityNuance: point.formalityNuance ?? '',
    exampleSentences: point.exampleSentences.join('\n'),
    jlptLevel: point.jlptLevel,
    frequencyTag: point.frequencyTag ?? '',
    n3Overlap: point.n3Overlap,
    setId: point.setId,
  };
}
