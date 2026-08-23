'use client';

import { useState } from 'react';
import {
  BookOpenCheck,
  ChevronDown,
  ChevronRight,
  FileCode2,
  FolderOpen,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { createClient } from '@/shared/supabase/client';
import { useConfirm } from '@/shared/hooks/useConfirm';
import type { ReadingPassage, ReadingPassageSet } from '../types';
import { ReadingHtmlImportForm } from './ReadingHtmlImportForm';
import { ReadingPassageForm } from './ReadingPassageForm';
import { ReadingPassageViewer } from './ReadingPassageViewer';

/**
 * Set-grouped passage list for the passage-bank tab (US1) — same collapsed
 * set-card shape as GrammarList.tsx, minus the global-catalog group (no
 * admin-curated passages exist, per spec.md's Assumptions) and minus
 * search/filter (not required by any FR for this feature; add later if the
 * list grows large enough to need it).
 */
interface ReadingPassageBankProps {
  passages: ReadingPassage[];
  initialSets: ReadingPassageSet[];
}

const UNSET_GROUP_KEY = '__unset__';

interface Group {
  key: string;
  name: string;
  canManage: boolean;
  passages: ReadingPassage[];
}

export function ReadingPassageBank({ passages: initialPassages, initialSets }: ReadingPassageBankProps) {
  const [passages, setPassages] = useState(initialPassages);
  const [sets, setSets] = useState(initialSets);
  const [addMode, setAddMode] = useState<'none' | 'html' | 'manual'>('none');
  const [openPassageId, setOpenPassageId] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [renamingGroup, setRenamingGroup] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');
  const [groupError, setGroupError] = useState<string | null>(null);
  const { confirm, confirmDialog } = useConfirm();

  const groups: Group[] = (() => {
    const byKey = new Map<string, ReadingPassage[]>();
    for (const p of passages) {
      const key = p.setId ?? UNSET_GROUP_KEY;
      const list = byKey.get(key) ?? [];
      list.push(p);
      byKey.set(key, list);
    }
    const ordered: Group[] = [];
    for (const set of sets) {
      const list = byKey.get(set.id);
      if (list) ordered.push({ key: set.id, name: set.name, canManage: true, passages: list });
    }
    const unset = byKey.get(UNSET_GROUP_KEY);
    if (unset) ordered.push({ key: UNSET_GROUP_KEY, name: 'Chưa thuộc set nào', canManage: false, passages: unset });
    return ordered;
  })();

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

  function handleSetCreated(set: ReadingPassageSet) {
    setSets((prev) => (prev.some((s) => s.id === set.id) ? prev : [...prev, set]));
  }

  function handleImported(imported: ReadingPassage[]) {
    setPassages((prev) => [...imported, ...prev]);
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      for (const p of imported) if (p.setId) next.add(p.setId);
      return next;
    });
    setAddMode('none');
  }

  function handleCreated(passage: ReadingPassage) {
    setPassages((prev) => [passage, ...prev]);
    if (passage.setId) expandGroup(passage.setId);
    setAddMode('none');
  }

  async function handleDelete(passage: ReadingPassage) {
    const ok = await confirm({
      title: `Xóa bài đọc "${passage.title}"?`,
      description: 'Không thể hoàn tác thao tác này. Các từ đã đính vào SRS hoặc lỗi sai đã ghi từ bài này sẽ không bị xóa.',
    });
    if (!ok) return;
    const supabase = createClient();
    const { error } = await supabase.from('reading_passages').delete().eq('id', passage.id);
    if (error) {
      setGroupError(error.message);
      return;
    }
    setPassages((prev) => prev.filter((p) => p.id !== passage.id));
    if (openPassageId === passage.id) setOpenPassageId(null);
  }

  async function handleRenameGroup(key: string, currentName: string) {
    const name = renameDraft.trim();
    setRenamingGroup(null);
    if (!name || name === currentName) return;
    const supabase = createClient();
    const { error } = await supabase.from('reading_passage_sets').update({ name }).eq('id', key);
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
        group.passages.length > 0
          ? `${group.passages.length} bài đọc trong set sẽ không bị xóa, chỉ mất nhóm (chuyển vào "Chưa thuộc set nào").`
          : undefined,
    });
    if (!ok) return;
    const supabase = createClient();
    const { error } = await supabase.from('reading_passage_sets').delete().eq('id', group.key);
    if (error) {
      setGroupError(error.message);
      return;
    }
    setSets((prev) => prev.filter((s) => s.id !== group.key));
    setPassages((prev) => prev.map((p) => (p.setId === group.key ? { ...p, setId: null } : p)));
  }

  return (
    <div className="space-y-4">
      {confirmDialog}
      <div className="card space-y-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm font-medium text-foreground">{passages.length} bài đọc</span>
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
              onClick={() => setAddMode((m) => (m === 'manual' ? 'none' : 'manual'))}
              className="btn-primary h-9 px-3 text-sm"
            >
              {addMode === 'manual' ? (
                <>
                  <X className="h-4 w-4" aria-hidden="true" />
                  Đóng
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Tạo bài đọc
                </>
              )}
            </button>
          </div>
        </div>
        {groupError && <p className="error-text">{groupError}</p>}
      </div>

      {addMode === 'html' && (
        <ReadingHtmlImportForm
          existingSets={sets}
          onSetCreated={handleSetCreated}
          onImported={handleImported}
          onCancel={() => setAddMode('none')}
        />
      )}
      {addMode === 'manual' && (
        <ReadingPassageForm sets={sets} onSetCreated={handleSetCreated} onSaved={handleCreated} onCancel={() => setAddMode('none')} />
      )}

      {passages.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border p-10 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <BookOpenCheck className="h-6 w-6 text-primary" aria-hidden="true" />
          </div>
          <p className="max-w-xs text-sm text-muted-foreground">
            Chưa có bài đọc nào — dùng nút &quot;Nhập từ HTML&quot; hoặc &quot;Tạo bài đọc&quot; ở trên để bắt đầu.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {groups.map((group) => {
            const expanded = expandedGroups.has(group.key);
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
                    <span className="shrink-0 text-xs text-muted-foreground">{group.passages.length} bài</span>
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
                  <div className="space-y-2 border-t border-border p-3">
                    {group.passages.map((passage) => (
                      <div key={passage.id} className="rounded-lg border border-border">
                        <div className="flex items-center justify-between gap-2 p-2.5">
                          <button
                            type="button"
                            onClick={() => setOpenPassageId((id) => (id === passage.id ? null : passage.id))}
                            className="flex min-w-0 flex-1 items-center gap-2 text-left text-sm text-foreground"
                          >
                            {openPassageId === passage.id ? (
                              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                            ) : (
                              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                            )}
                            <span className="truncate font-medium">{passage.title}</span>
                            <span className="shrink-0 text-xs text-muted-foreground">
                              {passage.questions.length} câu hỏi
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(passage)}
                            aria-label={`Xóa bài đọc: ${passage.title}`}
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-danger/10 hover:text-danger"
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                        </div>
                        {openPassageId === passage.id && (
                          <div className="border-t border-border p-3">
                            <ReadingPassageViewer passage={passage} />
                          </div>
                        )}
                      </div>
                    ))}
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
