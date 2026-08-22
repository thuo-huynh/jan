'use client';

import { useMemo, useState } from 'react';
import {
  ArrowLeftRight,
  BookOpen,
  ChevronDown,
  ChevronRight,
  FileCode2,
  FolderOpen,
  Pencil,
  Plus,
  Search,
  SearchX,
  Trash2,
  X,
} from 'lucide-react';
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

const GLOBAL_GROUP_KEY = '__global__';
const UNSET_GROUP_KEY = '__unset__';

interface Group {
  key: string;
  name: string;
  /** Only true for the caller's own grammar_sets — the global catalog and "no set" bucket can't be renamed/deleted. */
  canManage: boolean;
  points: GrammarPointWithProgress[];
}

/**
 * Client-side list wrapper for the grammar tracker page (T041). Points are
 * grouped into collapsed set cards (grammar_sets, 0025_grammar_sets.sql) —
 * same collapsed-by-default shape as CustomVocabManager — instead of one
 * long flat scroll, since that's exactly what got harder to use the more
 * custom points a caller added. The global N2 catalog always renders as its
 * own trailing, non-manageable group. Search/level/confusable-pair filters
 * still apply across every group at once (filtering happens before
 * grouping); a group with an active filter match auto-expands so results
 * are never hidden behind a collapsed header. Filtering happens client-side
 * over the already-fetched (~96-row) dataset rather than a route round-trip.
 */
export function GrammarList({ points: initialPoints, userId, initialSets }: GrammarListProps) {
  const [points, setPoints] = useState(initialPoints);
  const [sets, setSets] = useState(initialSets);
  const [levelFilter, setLevelFilter] = useState('');
  const [onlyConfusable, setOnlyConfusable] = useState(false);
  const [query, setQuery] = useState('');
  const [addMode, setAddMode] = useState<'none' | 'single' | 'html'>('none');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [renamingGroup, setRenamingGroup] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');
  const [groupError, setGroupError] = useState<string | null>(null);
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

  const visiblePoints = useMemo(() => {
    let list = points;
    if (levelFilter) list = list.filter((p) => p.jlptLevel === levelFilter);
    if (onlyConfusable) list = list.filter((p) => p.confusablePairs.length > 0);
    const q = query.trim().toLowerCase();
    if (q) list = list.filter((p) => p.pattern.toLowerCase().includes(q) || p.meaning.toLowerCase().includes(q));
    return list;
  }, [points, levelFilter, onlyConfusable, query]);

  const hasActiveFilter = levelFilter !== '' || onlyConfusable || query.trim().length > 0;

  const groups = useMemo<Group[]>(() => {
    const byKey = new Map<string, GrammarPointWithProgress[]>();
    for (const p of visiblePoints) {
      const key = !p.isCustom ? GLOBAL_GROUP_KEY : (p.setId ?? UNSET_GROUP_KEY);
      const list = byKey.get(key) ?? [];
      list.push(p);
      byKey.set(key, list);
    }

    const ordered: Group[] = [];
    for (const set of sets) {
      const list = byKey.get(set.id);
      if (list) ordered.push({ key: set.id, name: set.name, canManage: true, points: list });
    }
    const unset = byKey.get(UNSET_GROUP_KEY);
    if (unset) ordered.push({ key: UNSET_GROUP_KEY, name: 'Chưa thuộc set nào', canManage: false, points: unset });
    const global = byKey.get(GLOBAL_GROUP_KEY);
    if (global) ordered.push({ key: GLOBAL_GROUP_KEY, name: 'Kho ngữ pháp N2 chuẩn', canManage: false, points: global });
    return ordered;
  }, [visiblePoints, sets]);

  function toggleGroup(key: string) {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function expandGroup(key: string) {
    setExpandedGroups((prev) => new Set(prev).add(key));
  }

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
    const mapped = mapGrammarPoint(row, undefined, []);
    setPoints((prev) => [mapped, ...prev]);
    setAddMode('none');
    if (mapped.setId) expandGroup(mapped.setId);
  }

  function handleImported(rows: GrammarPointRecord[]) {
    const mapped = rows.map((row) => mapGrammarPoint(row, undefined, []));
    setPoints((prev) => [...mapped, ...prev]);
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      for (const m of mapped) if (m.setId) next.add(m.setId);
      return next;
    });
  }

  function handleUpdated(row: GrammarPointRecord) {
    setPoints((prev) =>
      prev.map((p) => (p.id === row.id ? mapGrammarPoint(row, toStatusRecord(p), p.confusablePairs) : p)),
    );
    setEditingId(null);
    if (row.set_id) expandGroup(row.set_id);
  }

  function handleDeleted(pointId: string) {
    setPoints((prev) => prev.filter((p) => p.id !== pointId));
  }

  async function handleRenameGroup(key: string, currentName: string) {
    const name = renameDraft.trim();
    setRenamingGroup(null);
    if (!name || name === currentName) return;
    const supabase = createClient();
    const { error } = await supabase.from('grammar_sets').update({ name }).eq('id', key);
    if (error) {
      setGroupError(error.message);
      return;
    }
    setSets((prev) => prev.map((s) => (s.id === key ? { ...s, name } : s)));
  }

  async function handleDeleteGroup(group: Group) {
    const ok = await confirm({
      title: `Xóa set "${group.name}"?`,
      description:
        group.points.length > 0
          ? `${group.points.length} điểm ngữ pháp trong set sẽ không bị xóa, chỉ mất nhóm (chuyển vào "Chưa thuộc set nào").`
          : undefined,
    });
    if (!ok) return;
    const supabase = createClient();
    const { error } = await supabase.from('grammar_sets').delete().eq('id', group.key);
    if (error) {
      setGroupError(error.message);
      return;
    }
    setSets((prev) => prev.filter((s) => s.id !== group.key));
    setPoints((prev) => prev.map((p) => (p.setId === group.key ? { ...p, setId: null } : p)));
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
          {hasActiveFilter && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setLevelFilter('');
                setOnlyConfusable(false);
              }}
              className="btn-ghost h-9 px-2.5 text-xs"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
              Xóa bộ lọc
            </button>
          )}
        </div>
        {groupError && <p className="error-text">{groupError}</p>}
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
          existingPatterns={points.filter((p) => p.isCustom).map((p) => p.pattern)}
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
        <ul className="space-y-2">
          {groups.map((group) => {
            const expanded = hasActiveFilter || expandedGroups.has(group.key);
            return (
              <li key={group.key} className="card p-0">
                <div className="flex items-center justify-between gap-2 p-3">
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.key)}
                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                  >
                    {expanded ? (
                      <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    )}
                    <FolderOpen className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                    {renamingGroup === group.key ? (
                      <input
                        autoFocus
                        value={renameDraft}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => setRenameDraft(e.target.value)}
                        onBlur={() => handleRenameGroup(group.key, group.name)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleRenameGroup(group.key, group.name);
                          if (e.key === 'Escape') setRenamingGroup(null);
                        }}
                        className="input-field h-8 flex-1"
                      />
                    ) : (
                      <span className="truncate text-sm font-semibold text-foreground">{group.name}</span>
                    )}
                    <span className="shrink-0 text-xs text-muted-foreground">{group.points.length} điểm</span>
                  </button>
                  {group.canManage && (
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setRenamingGroup(group.key);
                          setRenameDraft(group.name);
                        }}
                        aria-label={`Đổi tên set ${group.name}`}
                        className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      >
                        <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteGroup(group)}
                        aria-label={`Xóa set ${group.name}`}
                        className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-danger/10 hover:text-danger"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  )}
                </div>
                {expanded && (
                  <div className="space-y-3 border-t border-border p-3">
                    {group.points.map((point) =>
                      editingId === point.id ? (
                        <GrammarPointForm
                          key={point.id}
                          mode="edit"
                          pointId={point.id}
                          initialValues={toFormValues(point)}
                          sets={sets}
                          onSetCreated={handleSetCreated}
                          onSaved={handleUpdated}
                          onCancel={() => setEditingId(null)}
                        />
                      ) : (
                        <GrammarPointRow
                          key={point.id}
                          point={point}
                          userId={userId}
                          onStatusChange={handleStatusChange}
                          onNoteChange={handleNoteChange}
                          onEdit={point.isCustom ? setEditingId : undefined}
                          onDeleted={point.isCustom ? handleDeleted : undefined}
                        />
                      ),
                    )}
                  </div>
                )}
              </li>
            );
          })}
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
