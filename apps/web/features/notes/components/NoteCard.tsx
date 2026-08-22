'use client';

import { useState, type MouseEvent } from 'react';
import Link from 'next/link';
import { Pin } from 'lucide-react';
import { createClient } from '@/shared/supabase/client';
import type { Note } from '../lib/types';
import { formatRelativeTime, markdownExcerpt } from '../lib/utils';

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
      aria-label={pinnedState ? 'Bỏ ghim' : 'Ghim ghi chú'}
      title={pinnedState ? 'Bỏ ghim' : 'Ghim ghi chú'}
      className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded border transition-colors disabled:opacity-60 ${
        pinnedState
          ? 'border-accent/40 bg-accent/10 text-accent'
          : 'border-border text-muted-foreground hover:border-accent/40 hover:text-accent'
      } ${className}`}
    >
      <Pin className="h-4 w-4" fill={pinnedState ? 'currentColor' : 'none'} strokeWidth={1.75} aria-hidden="true" />
    </button>
  );
}

export function NoteCard({ note }: { note: Note }) {
  const excerpt = markdownExcerpt(note.body_markdown ?? '', 140);

  return (
    <div className="card-interactive flex flex-col gap-2 hover:border-primary/40">
      <div className="flex items-start justify-between gap-2">
        <Link
          href={`/notes/${note.id}`}
          className="line-clamp-1 flex-1 text-sm font-semibold text-foreground transition-colors hover:text-primary"
        >
          {note.title.trim() || 'Ghi chú chưa đặt tên'}
        </Link>
        <PinButton noteId={note.id} pinned={note.pinned} />
      </div>

      <p className="line-clamp-2 min-h-[2.5rem] text-sm text-muted-foreground">
        {excerpt || 'Chưa có nội dung.'}
      </p>

      {(note.folder || note.tags.length > 0) && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          {note.folder && <span className="badge-neutral">{note.folder}</span>}
          {note.tags.map((tag) => (
            <span key={tag} className="badge-primary">
              #{tag}
            </span>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground">Đã sửa {formatRelativeTime(note.updated_at)}</p>
    </div>
  );
}
