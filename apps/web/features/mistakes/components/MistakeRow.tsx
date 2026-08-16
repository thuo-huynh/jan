'use client';

import { useState } from 'react';
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

  const hasLink = Boolean(mistake.linked_vocab_id || mistake.linked_grammar_id);

  async function handleAddToSrs() {
    setAddingToSrs(true);
    setSrsError(null);
    setSrsMessage(null);
    try {
      const res = await fetch(`/api/mistakes/${mistake.id}/add-to-srs`, { method: 'POST' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}) as { error?: string });
        throw new Error(body.error ?? 'Failed to add to SRS queue');
      }
      setSrsMessage('Added to review queue.');
    } catch (err) {
      setSrsError(err instanceof Error ? err.message : 'Failed to add to SRS queue');
    } finally {
      setAddingToSrs(false);
    }
  }

  async function handleToggleResolved() {
    setTogglingResolved(true);
    const supabase = createClient();
    const nextResolved = !mistake.resolved;
    const { error } = await supabase
      .from('mistake_notebook')
      .update({ resolved: nextResolved })
      .eq('id', mistake.id);
    setTogglingResolved(false);
    if (!error) {
      onResolvedChange(mistake.id, nextResolved);
    }
  }

  return (
    <li
      className={`rounded-lg border border-border bg-card p-3 ${mistake.resolved ? 'opacity-60' : ''}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              {mistake.source === 'mock_test' ? 'Mock test' : 'Manual'}
            </span>
            {mistake.resolved && (
              <span className="rounded-full bg-success/15 px-2 py-0.5 text-xs font-medium text-success">
                Resolved
              </span>
            )}
          </div>
          <p className={`text-sm text-foreground ${mistake.resolved ? 'line-through' : ''}`}>
            {mistake.content}
          </p>
        </div>
        <button
          type="button"
          onClick={handleToggleResolved}
          disabled={togglingResolved}
          className="shrink-0 rounded-md border border-border px-2 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-60"
        >
          {mistake.resolved ? 'Reopen' : 'Mark resolved'}
        </button>
      </div>

      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          onClick={handleAddToSrs}
          disabled={!hasLink || addingToSrs}
          title={hasLink ? undefined : 'Link a vocab or grammar item to add this to the SRS queue'}
          className="rounded-md border border-border px-2 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
        >
          {addingToSrs ? 'Adding…' : 'Add to SRS queue'}
        </button>
        {srsMessage && <span className="text-xs text-success">{srsMessage}</span>}
        {srsError && <span className="text-xs text-danger">{srsError}</span>}
      </div>
    </li>
  );
}
