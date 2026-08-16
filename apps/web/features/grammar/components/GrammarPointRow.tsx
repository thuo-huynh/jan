'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/shared/supabase/client';
import type { GrammarPointWithProgress, GrammarStatus } from '../types';
import { GrammarNoteEditor } from './GrammarNoteEditor';

interface GrammarPointRowProps {
  point: GrammarPointWithProgress;
  userId: string;
  onStatusChange: (pointId: string, status: GrammarStatus) => void;
  onNoteChange: (pointId: string, notesUser: string | null) => void;
}

const STATUS_OPTIONS: { value: GrammarStatus; label: string; title: string }[] = [
  { value: 'not_started', label: 'Chưa học', title: 'Not started' },
  { value: 'learning', label: 'Đang ôn', title: 'Learning' },
  { value: 'mastered', label: 'Đã thuộc', title: 'Mastered' },
];

const STATUS_ACTIVE_STYLES: Record<GrammarStatus, string> = {
  not_started: 'bg-muted text-foreground',
  learning: 'bg-warning/15 text-warning',
  mastered: 'bg-success/15 text-success',
};

/**
 * One grammar point: full detail (pattern/meaning/connection form/nuance/
 * examples/frequency tag), its status control (T042/T043), a link to any
 * confusable-pair comparison it's part of (T048), and an expandable personal
 * note editor (T044). Status changes lazy-create the `user_grammar_status`
 * row via upsert — RLS (owner-scoped) is the authorization boundary, so this
 * mutates straight from the browser client with optimistic UI + rollback on
 * failure, no route handler.
 */
export function GrammarPointRow({ point, userId, onStatusChange, onNoteChange }: GrammarPointRowProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notesOpen, setNotesOpen] = useState(false);

  async function handleStatusClick(newStatus: GrammarStatus) {
    if (newStatus === point.status || saving) return;

    const previousStatus = point.status;
    onStatusChange(point.id, newStatus);
    setSaving(true);
    setError(null);

    const supabase = createClient();
    const { error: upsertError } = await supabase.from('user_grammar_status').upsert(
      {
        user_id: userId,
        grammar_point_id: point.id,
        status: newStatus,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,grammar_point_id' },
    );

    setSaving(false);
    if (upsertError) {
      onStatusChange(point.id, previousStatus);
      setError('Could not save status. Please try again.');
    }
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-jp text-lg font-semibold text-foreground">{point.pattern}</h3>
            {point.frequencyTag && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {point.frequencyTag}
              </span>
            )}
            {point.n3Overlap && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                N3 overlap
              </span>
            )}
          </div>

          <p className="mt-1 text-sm text-foreground">{point.meaning}</p>

          {point.connectionForm && (
            <p className="mt-1 text-xs text-muted-foreground">接続: {point.connectionForm}</p>
          )}
          {point.formalityNuance && (
            <p className="mt-1 text-xs text-muted-foreground">{point.formalityNuance}</p>
          )}

          {point.exampleSentences.length > 0 && (
            <ul className="mt-2 space-y-1">
              {point.exampleSentences.map((sentence, i) => (
                <li key={i} className="font-jp text-sm text-foreground/90">
                  {sentence}
                </li>
              ))}
            </ul>
          )}

          {point.confusablePairs.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {point.confusablePairs.map((pair) => (
                <Link
                  key={pair.pairId}
                  href={`/learn/grammar/confusables/${pair.pairId}`}
                  className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
                >
                  Confusable{pair.partnerPattern ? ` — vs. ${pair.partnerPattern}` : ''}
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-shrink-0 flex-col items-end gap-2">
          <div
            className="inline-flex overflow-hidden rounded-md border border-border"
            role="group"
            aria-label={`Status for ${point.pattern}`}
          >
            {STATUS_OPTIONS.map((opt, i) => {
              const active = point.status === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  title={opt.title}
                  disabled={saving}
                  aria-pressed={active}
                  onClick={() => handleStatusClick(opt.value)}
                  className={`px-2.5 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                    i > 0 ? 'border-l border-border' : ''
                  } ${active ? STATUS_ACTIVE_STYLES[opt.value] : 'bg-card text-muted-foreground hover:bg-muted'}`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => setNotesOpen((open) => !open)}
            className="text-xs font-medium text-primary transition-colors hover:text-primary/80"
          >
            {notesOpen ? 'Hide notes' : point.notesUser ? 'Edit notes' : 'Add notes'}
          </button>
        </div>
      </div>

      {error && <p className="mt-2 text-xs text-danger">{error}</p>}

      {notesOpen && (
        <div className="mt-3 border-t border-border pt-3">
          <GrammarNoteEditor
            grammarPointId={point.id}
            userId={userId}
            initialNote={point.notesUser}
            onSaved={(note) => onNoteChange(point.id, note)}
          />
        </div>
      )}
    </div>
  );
}
