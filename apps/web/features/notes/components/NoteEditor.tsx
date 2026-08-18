'use client';

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { createClient } from '@/shared/supabase/client';
import { useConfirm } from '@/shared/hooks/useConfirm';
import { noteSchema } from '@/shared/validation/schemas';
import type { LinkedItemInfo, Note, TaskOption, VocabOption } from '../lib/types';
import { FolderTagPicker } from './FolderTagPicker';
import { NoteLinkPicker } from './NoteLinkPicker';
import { MarkdownPreview } from './MarkdownPreview';
import { PinButton } from './NoteCard';
import { formatRelativeTime } from '../lib/utils';

/**
 * Note detail/editor page content (T079): markdown source editing (via an
 * Edit/Preview toggle rather than a split pane or full WYSIWYG, per the
 * task's "simple ... is fine" allowance) + sanitized rendering, wired to
 * folder/tag editing (T080), the pin toggle (T081, reusing NoteCard's
 * PinButton), the task/vocab link picker (T083), and graceful display of a
 * link target that's gone missing (T084).
 *
 * Mutates via the browser Supabase client under RLS — no API route, per this
 * project's mutation convention.
 */
export function NoteEditor({
  note,
  folderOptions,
  taskOptions,
  vocabOptions,
  linkedTaskInfo,
  linkedVocabInfo,
  linkedTaskMissing,
  linkedVocabMissing,
}: {
  note: Note;
  folderOptions: string[];
  taskOptions: TaskOption[];
  vocabOptions: VocabOption[];
  linkedTaskInfo: LinkedItemInfo | null;
  linkedVocabInfo: LinkedItemInfo | null;
  linkedTaskMissing: boolean;
  linkedVocabMissing: boolean;
}) {
  const router = useRouter();

  const [title, setTitle] = useState(note.title);
  const [bodyMarkdown, setBodyMarkdown] = useState(note.body_markdown);
  const [folder, setFolder] = useState<string | null>(note.folder);
  const [tags, setTags] = useState<string[]>(note.tags);
  const [linkedTaskId, setLinkedTaskId] = useState<string | null>(note.linked_task_id);
  const [linkedVocabId, setLinkedVocabId] = useState<string | null>(note.linked_vocab_id);
  const [mode, setMode] = useState<'edit' | 'preview'>('edit');
  const [status, setStatus] = useState<'idle' | 'saved' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const { confirm, confirmDialog } = useConfirm();

  const dirty = useMemo(
    () =>
      title !== note.title ||
      bodyMarkdown !== note.body_markdown ||
      folder !== note.folder ||
      JSON.stringify(tags) !== JSON.stringify(note.tags) ||
      linkedTaskId !== note.linked_task_id ||
      linkedVocabId !== note.linked_vocab_id,
    [title, bodyMarkdown, folder, tags, linkedTaskId, linkedVocabId, note],
  );

  function handleSave() {
    const parsed = noteSchema.safeParse({
      title,
      bodyMarkdown,
      folder,
      tags,
      linkedTaskId,
      linkedVocabId,
    });

    if (!parsed.success) {
      setStatus('error');
      setErrorMessage(parsed.error.issues[0]?.message ?? 'Invalid note');
      return;
    }

    startTransition(async () => {
      const supabase = createClient();
      const { error } = await supabase
        .from('notes')
        .update({
          title: parsed.data.title,
          body_markdown: parsed.data.bodyMarkdown,
          folder: parsed.data.folder ?? null,
          tags: parsed.data.tags,
          linked_task_id: parsed.data.linkedTaskId ?? null,
          linked_vocab_id: parsed.data.linkedVocabId ?? null,
        })
        .eq('id', note.id);

      if (error) {
        setStatus('error');
        setErrorMessage(error.message);
        return;
      }

      setStatus('saved');
      setErrorMessage(null);
      router.refresh();
    });
  }

  async function handleDelete() {
    const ok = await confirm({ title: 'Delete this note?', description: 'This cannot be undone.' });
    if (!ok) return;

    startTransition(async () => {
      const supabase = createClient();
      const { error } = await supabase.from('notes').delete().eq('id', note.id);

      if (error) {
        setStatus('error');
        setErrorMessage(error.message);
        return;
      }

      router.push('/notes');
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {confirmDialog}
      <Link
        href="/notes"
        className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to notes
      </Link>

      <div className="flex items-start justify-between gap-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Untitled note"
          aria-label="Note title"
          className="w-full border-none bg-transparent text-2xl font-semibold text-foreground focus:outline-none"
        />
        <div className="flex shrink-0 items-center gap-3">
          <span className="hidden text-xs text-muted-foreground sm:inline">
            Edited {formatRelativeTime(note.updated_at)}
          </span>
          <PinButton noteId={note.id} pinned={note.pinned} />
          <button
            type="button"
            onClick={handleDelete}
            disabled={isPending}
            aria-label="Delete note"
            className="btn-outline h-9 border-danger/40 px-3 text-xs text-danger hover:bg-danger/10"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            Delete
          </button>
        </div>
      </div>

      <FolderTagPicker
        folder={folder}
        tags={tags}
        folderOptions={folderOptions}
        onFolderChange={setFolder}
        onTagsChange={setTags}
      />

      <NoteLinkPicker
        taskOptions={taskOptions}
        vocabOptions={vocabOptions}
        linkedTaskId={linkedTaskId}
        linkedVocabId={linkedVocabId}
        onLinkedTaskChange={setLinkedTaskId}
        onLinkedVocabChange={setLinkedVocabId}
      />

      {/*
        T084: graceful display when a link target no longer exists. Because
        linked_task_id/linked_vocab_id are ON DELETE SET NULL, a deleted
        target normally just clears the id (nothing broken to render at
        all) — the *Missing flags below only catch the narrow race where the
        target was deleted between the note fetch and the link-target fetch
        server-side; in the steady state these banners simply don't render.
      */}
      {linkedTaskMissing && (
        <p className="rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-warning">
          This note was linked to a task that is no longer available.
        </p>
      )}
      {linkedVocabMissing && (
        <p className="rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-warning">
          This note was linked to a vocab/kanji entry that is no longer available.
        </p>
      )}
      {linkedTaskInfo && (
        <p className="text-sm text-muted-foreground">
          Linked task: <span className="font-medium text-foreground">{linkedTaskInfo.label}</span>
        </p>
      )}
      {linkedVocabInfo && (
        <p className="text-sm text-muted-foreground">
          Linked vocab: <span className="font-medium text-foreground">{linkedVocabInfo.label}</span>
        </p>
      )}

      <div>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div className="inline-flex rounded border border-border bg-muted p-1">
            <button
              type="button"
              onClick={() => setMode('edit')}
              aria-pressed={mode === 'edit'}
              className={`rounded px-3 py-1 text-sm font-medium transition-colors ${
                mode === 'edit'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => setMode('preview')}
              aria-pressed={mode === 'preview'}
              className={`rounded px-3 py-1 text-sm font-medium transition-colors ${
                mode === 'preview'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Preview
            </button>
          </div>
          {mode === 'edit' && (
            <p className="helper-text">
              Supports <span className="font-mono"># headings</span>,{' '}
              <span className="font-mono">**bold**</span>, <span className="font-mono">- lists</span>,{' '}
              <span className="font-mono">`code`</span>, <span className="font-mono">[links](url)</span>, and
              GFM tables.
            </p>
          )}
        </div>

        {mode === 'edit' ? (
          <textarea
            value={bodyMarkdown}
            onChange={(e) => setBodyMarkdown(e.target.value)}
            rows={18}
            placeholder="Write in markdown… headings, lists, **bold**, `code`."
            aria-label="Note body (markdown)"
            className="textarea-field font-mono"
          />
        ) : (
          <div className="min-h-[20rem] rounded-lg border border-border bg-card px-4 py-3">
            <MarkdownPreview markdown={bodyMarkdown} />
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button type="button" onClick={handleSave} disabled={isPending || !dirty} className="btn-primary">
          {isPending ? 'Saving…' : 'Save'}
        </button>
        {status === 'saved' && !dirty && <span className="text-sm text-success">Saved</span>}
        {status === 'error' && errorMessage && (
          <span className="text-sm text-danger">{errorMessage}</span>
        )}
      </div>
    </div>
  );
}
