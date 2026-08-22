'use client';

import { useState } from 'react';
import { BookPlus, CheckCircle2, RotateCcw } from 'lucide-react';
import { createClient } from '@/shared/supabase/client';
import type { MistakeEntry } from '../types';

/**
 * Single mistake row: "add to SRS queue" action (T068, wired to
 * POST /api/mistakes/[id]/add-to-srs, T067 — disabled when the entry has no
 * vocab/grammar link) + "mark resolved" toggle (T069 — visually distinguishes,
 * never deletes).
 */
interface MistakeRowProps {
  mistake: MistakeEntry;
  onResolvedChange: (id: string, resolved: boolean) => void;
}

export function MistakeRow({ mistake, onResolvedChange }: MistakeRowProps) {
  const [addingToSrs, setAddingToSrs] = useState(false);
  const [srsMessage, setSrsMessage] = useState<string | null>(null);
  const [srsError, setSrsError] = useState<string | null>(null);
  const [togglingResolved, setTogglingResolved] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);

  const hasLink = Boolean(mistake.linked_vocab_id || mistake.linked_grammar_id);

  async function handleAddToSrs() {
    setAddingToSrs(true);
    setSrsError(null);
    setSrsMessage(null);
    try {
      const res = await fetch(`/api/mistakes/${mistake.id}/add-to-srs`, { method: 'POST' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}) as { error?: string });
        throw new Error(body.error ?? 'Thêm vào hàng đợi SRS thất bại');
      }
      setSrsMessage('Đã thêm vào hàng đợi ôn tập.');
    } catch (err) {
      setSrsError(err instanceof Error ? err.message : 'Thêm vào hàng đợi SRS thất bại');
    } finally {
      setAddingToSrs(false);
    }
  }

  async function handleToggleResolved() {
    setTogglingResolved(true);
    setResolveError(null);
    const supabase = createClient();
    const nextResolved = !mistake.resolved;
    const { error } = await supabase
      .from('mistake_notebook')
      .update({ resolved: nextResolved })
      .eq('id', mistake.id);
    setTogglingResolved(false);
    if (error) {
      setResolveError(error.message);
      return;
    }
    onResolvedChange(mistake.id, nextResolved);
  }

  return (
    <li className={`card p-3 ${mistake.resolved ? 'opacity-60' : ''}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <span className="badge-neutral">{mistake.source === 'mock_test' ? 'Đề thi thử' : 'Tự nhập'}</span>
            {mistake.resolved && <span className="badge-success">Đã xử lý</span>}
          </div>
          <p className={`text-sm text-foreground ${mistake.resolved ? 'line-through' : ''}`}>
            {mistake.content}
          </p>
        </div>
        <button
          type="button"
          onClick={handleToggleResolved}
          disabled={togglingResolved}
          className={`btn-outline h-7 shrink-0 px-2 text-xs ${
            mistake.resolved
              ? 'hover:border-warning hover:text-warning'
              : 'hover:border-success hover:text-success'
          }`}
        >
          {mistake.resolved ? (
            <>
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              Mở lại
            </>
          ) : (
            <>
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
              Đánh dấu đã xử lý
            </>
          )}
        </button>
      </div>

      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          onClick={handleAddToSrs}
          disabled={!hasLink || addingToSrs}
          title={hasLink ? undefined : 'Liên kết một từ vựng hoặc điểm ngữ pháp để thêm vào hàng đợi SRS'}
          className="btn-outline h-7 px-2 text-xs hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:hover:border-border disabled:hover:text-muted-foreground"
        >
          <BookPlus className="h-3.5 w-3.5" aria-hidden="true" />
          {addingToSrs ? 'Đang thêm…' : 'Thêm vào hàng đợi SRS'}
        </button>
        {srsMessage && <span className="text-xs text-success">{srsMessage}</span>}
        {srsError && <span className="error-text mt-0">{srsError}</span>}
      </div>
      {resolveError && <p className="error-text">{resolveError}</p>}
    </li>
  );
}
