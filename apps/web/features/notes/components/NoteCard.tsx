'use client';

import { useState, type MouseEvent } from 'react';
import Link from 'next/link';
import { createClient } from '@/shared/supabase/client';
import type { Note } from '../lib/types';
import { markdownExcerpt } from '../lib/utils';

function PinIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={1.75}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.5 3.5h5l.75 5.5 3.25 3-1 1.5h-4.5v5.5l-1 2-1-2v-5.5h-4.5l-1-1.5 3.25-3 .75-5.5Z"
      />
    </svg>
  );
}

/**
 * Pin toggle wired directly to `notes.pinned` (T081). Exported so the note
 * detail/editor page can reuse the exact same control instead of
 * duplicating the mutation logic.
 *
 * Mutates via the browser Supabase client under RLS (owner-scoped on
 * `notes`) — no API route, per this project's mutation convention.
 */
export function PinButton({
  noteId,
  pinned,
  onToggled,
  className = '',
}: {
  noteId: string;
  pinned: boolean;
  onToggled?: (pinned: boolean) => void;
  className?: string;
}) {
  const [pinnedState, setPinnedState] = useState(pinned);
  const [saving, setSaving] = useState(false);

  async function handleToggle(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (saving) return;

    const next = !pinnedState;
    setPinnedState(next); // optimistic
    setSaving(true);

    const supabase = createClient();
    const { error } = await supabase.from('notes').update({ pinned: next }).eq('id', noteId);

    setSaving(false);
    if (error) {
      setPinnedState(!next); // revert on failure
      return;
    }
    onToggled?.(next);
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={saving}
      aria-pressed={pinnedState}
      aria-label={pinnedState ? 'Unpin note' : 'Pin note'}
      title={pinnedState ? 'Unpin note' : 'Pin note'}
      className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border transition-colors disabled:opacity-60 ${
        pinnedState
          ? 'border-accent/40 bg-accent/10 text-accent'
          : 'border-border text-muted-foreground hover:border-accent/40 hover:text-accent'
      } ${className}`}
    >
      <PinIcon filled={pinnedState} />
    </button>
  );
}

export function NoteCard({ note }: { note: Note }) {
  const excerpt = markdownExcerpt(note.body_markdown ?? '', 140);

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/40">
      <div className="flex items-start justify-between gap-2">
        <Link
          href={`/notes/${note.id}`}
          className="line-clamp-1 flex-1 font-semibold text-foreground transition-colors hover:text-primary"
        >
          {note.title.trim() || 'Untitled note'}
        </Link>
        <PinButton noteId={note.id} pinned={note.pinned} />
      </div>

      <p className="line-clamp-2 min-h-[2.5rem] text-sm text-muted-foreground">
        {excerpt || 'No content yet.'}
      </p>

      {(note.folder || note.tags.length > 0) && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
          {note.folder && (
            <span className="rounded-full bg-muted px-2 py-0.5 font-medium text-muted-foreground">
              {note.folder}
            </span>
          )}
          {note.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
