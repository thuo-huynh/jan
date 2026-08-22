'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, FolderOpen, ListPlus, Pencil, Plus, Trash2, X } from 'lucide-react';
import { createClient } from '@/shared/supabase/client';
import { useConfirm } from '@/shared/hooks/useConfirm';
import { VocabEntryForm, type CustomVocabEntry } from './VocabEntryForm';
import { BulkVocabAddForm } from './BulkVocabAddForm';
import type { VocabSet } from '../types';

export type { CustomVocabEntry } from './VocabEntryForm';

const UNSET_BUCKET = '__unset__';

interface CustomVocabManagerProps {
  initialEntries: CustomVocabEntry[];
  initialSets: VocabSet[];
}

/**
 * Deck management surface for the caller's own custom vocab/kanji entries
 * (T051/T052) — add, edit, delete, grouped into Quizlet-style "sets"
 * (vocab_sets, 0023_vocab_sets.sql) instead of one flat list every word ever
 * added gets appended to. Only one set is expanded at a time so adding to a
 * large collection doesn't turn into a long scroll to find anything — the
 * exact complaint this replaces. Global reference-deck browsing is handled
 * separately (read-only, server-rendered) in the vocab page itself.
 */
export function CustomVocabManager({ initialEntries, initialSets }: CustomVocabManagerProps) {
  const [entries, setEntries] = useState(initialEntries);
  const [sets, setSets] = useState(initialSets);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addMode, setAddMode] = useState<'none' | 'single' | 'bulk'>('none');
  const [expandedSetId, setExpandedSetId] = useState<string | null>(null);
  const [renamingSetId, setRenamingSetId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const { confirm, confirmDialog } = useConfirm();

  const entriesBySetId = useMemo(() => {
    const map = new Map<string, CustomVocabEntry[]>();
    for (const entry of entries) {
      const key = entry.set_id ?? UNSET_BUCKET;
      const list = map.get(key) ?? [];
      list.push(entry);
      map.set(key, list);
    }
    return map;
  }, [entries]);

  const unsetEntries = entriesBySetId.get(UNSET_BUCKET) ?? [];

  function handleSetCreated(set: VocabSet) {
    setSets((prev) => [...prev, set]);
  }

  function handleCreated(entry: CustomVocabEntry) {
    setEntries((prev) => [entry, ...prev]);
    setAddMode('none');
    if (entry.set_id) setExpandedSetId(entry.set_id);
  }

  function handleBulkImported(imported: CustomVocabEntry[]) {
    setEntries((prev) => [...imported, ...prev]);
    setAddMode('none');
    const setId = imported[0]?.set_id;
    if (setId) setExpandedSetId(setId);
  }

  function handleUpdated(entry: CustomVocabEntry) {
    setEntries((prev) => prev.map((e) => (e.id === entry.id ? entry : e)));
    setEditingId(null);
  }

  async function handleDelete(id: string) {
    const ok = await confirm({
      title: 'Xóa mục từ vựng này?',
      description: 'Lịch sử ôn tập của mục này cũng sẽ bị xóa.',
    });
    if (!ok) return;
    setDeleteError(null);
    const supabase = createClient();
    const { error } = await supabase.from('vocab_entries').delete().eq('id', id);
    if (error) {
      setDeleteError(error.message);
      return;
    }
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  async function handleRenameSet(setId: string) {
    const name = renameDraft.trim();
    if (!name) {
      setRenamingSetId(null);
      return;
    }
    const supabase = createClient();
    const { error } = await supabase.from('vocab_sets').update({ name }).eq('id', setId);
    if (!error) {
      setSets((prev) => prev.map((s) => (s.id === setId ? { ...s, name } : s)));
    }
    setRenamingSetId(null);
  }

  async function handleDeleteSet(set: VocabSet) {
    const count = (entriesBySetId.get(set.id) ?? []).length;
    const ok = await confirm({
      title: `Xóa set "${set.name}"?`,
      description:
        count > 0
          ? `${count} từ trong set sẽ không bị xóa, chỉ mất nhóm (chuyển vào "Chưa phân loại").`
          : undefined,
    });
    if (!ok) return;
    const supabase = createClient();
    const { error } = await supabase.from('vocab_sets').delete().eq('id', set.id);
    if (error) {
      setDeleteError(error.message);
      return;
    }
    setSets((prev) => prev.filter((s) => s.id !== set.id));
    setEntries((prev) => prev.map((e) => (e.set_id === set.id ? { ...e, set_id: null } : e)));
    if (expandedSetId === set.id) setExpandedSetId(null);
  }

  function renderEntryRow(entry: CustomVocabEntry) {
    return editingId === entry.id ? (
      <li key={entry.id}>
        <VocabEntryForm
          mode="edit"
          entryId={entry.id}
          sets={sets}
          onSetCreated={handleSetCreated}
          initialValues={{
            word: entry.word,
            reading: entry.reading,
            meaning: entry.meaning,
            example: entry.example,
            jlptLevel: entry.jlpt_level,
            isKanji: entry.is_kanji,
            setId: entry.set_id,
          }}
          onSaved={handleUpdated}
          onCancel={() => setEditingId(null)}
        />
      </li>
    ) : (
      <li key={entry.id} className="card flex items-center justify-between gap-4 p-3">
        <div>
          <p className="font-jp text-base text-foreground">
            {entry.word}
            {entry.reading && <span className="ml-2 text-sm text-muted-foreground">{entry.reading}</span>}
          </p>
          <p className="text-sm text-muted-foreground">{entry.meaning}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="badge-neutral">{entry.is_kanji ? 'hán tự' : 'từ vựng'}</span>
          <button
            type="button"
            onClick={() => setEditingId(entry.id)}
            aria-label={`Sửa ${entry.word}`}
            className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => handleDelete(entry.id)}
            aria-label={`Xóa ${entry.word}`}
            className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-danger/10 hover:text-danger"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </li>
    );
  }

  return (
    <div className="space-y-4">
      {confirmDialog}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">Từ vựng bạn tự thêm</h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setAddMode((m) => (m === 'bulk' ? 'none' : 'bulk'))}
            className="btn-outline h-9 px-3 text-sm"
          >
            {addMode === 'bulk' ? (
              <>
                <X className="h-4 w-4" aria-hidden="true" />
                Đóng
              </>
            ) : (
              <>
                <ListPlus className="h-4 w-4" aria-hidden="true" />
                Thêm hàng loạt
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
                Thêm từ
              </>
            )}
          </button>
        </div>
      </div>

      {addMode === 'single' && (
        <VocabEntryForm
          mode="create"
          sets={sets}
          onSetCreated={handleSetCreated}
          onSaved={handleCreated}
          onCancel={() => setAddMode('none')}
        />
      )}
      {addMode === 'bulk' && (
        <BulkVocabAddForm
          sets={sets}
          onSetCreated={handleSetCreated}
          onImported={handleBulkImported}
          onCancel={() => setAddMode('none')}
        />
      )}

      {deleteError && <p className="error-text">{deleteError}</p>}

      {sets.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border p-8 text-center">
          <p className="max-w-xs text-sm text-muted-foreground">
            Chưa có set nào — thêm từ đầu tiên ở trên để tạo set, giống một học phần trên Quizlet.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {sets.map((set) => {
            const setEntries = entriesBySetId.get(set.id) ?? [];
            const expanded = expandedSetId === set.id;
            return (
              <li key={set.id} className="card p-0">
                <div className="flex items-center justify-between gap-2 p-3">
                  <button
                    type="button"
                    onClick={() => setExpandedSetId(expanded ? null : set.id)}
                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                  >
                    {expanded ? (
                      <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    )}
                    <FolderOpen className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                    {renamingSetId === set.id ? (
                      <input
                        autoFocus
                        value={renameDraft}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => setRenameDraft(e.target.value)}
                        onBlur={() => handleRenameSet(set.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleRenameSet(set.id);
                          if (e.key === 'Escape') setRenamingSetId(null);
                        }}
                        className="input-field h-8 flex-1"
                      />
                    ) : (
                      <span className="truncate text-sm font-semibold text-foreground">{set.name}</span>
                    )}
                    <span className="shrink-0 text-xs text-muted-foreground">{setEntries.length} từ</span>
                  </button>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setRenamingSetId(set.id);
                        setRenameDraft(set.name);
                      }}
                      aria-label={`Đổi tên set ${set.name}`}
                      className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteSet(set)}
                      aria-label={`Xóa set ${set.name}`}
                      className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-danger/10 hover:text-danger"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </div>
                {expanded && (
                  <div className="space-y-2 border-t border-border p-3">
                    {setEntries.length === 0 ? (
                      <p className="py-2 text-center text-sm text-muted-foreground">Set này chưa có từ nào.</p>
                    ) : (
                      <ul className="space-y-2">{setEntries.map(renderEntryRow)}</ul>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {unsetEntries.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground">Chưa thuộc set nào</h3>
          <ul className="space-y-2">{unsetEntries.map(renderEntryRow)}</ul>
        </div>
      )}
    </div>
  );
}
