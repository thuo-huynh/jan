'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/shared/supabase/client';
import { noteSchema } from '@/shared/validation/schemas';
import type { LinkedItemInfo, Note, TaskOption, VocabOption } from '../lib/types';
import { FolderTagPicker } from './FolderTagPicker';
import { NoteLinkPicker } from './NoteLinkPicker';
import { MarkdownPreview } from './MarkdownPreview';
import { PinButton } from './NoteCard';

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

  function handleDelete() {
    if (typeof window !== 'undefined' && !window.confirm('Delete this note? This cannot be undone.')) {
      return;
    }

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
      <div className="flex items-start justify-between gap-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Untitled note"
          aria-label="Note title"
          className="w-full border-none bg-transparent text-2xl font-semibold text-foreground focus:outline-none"
        />
        <div className="flex shrink-0 items-center gap-2">
          <PinButton noteId={note.id} pinned={note.pinned} />
          <button
            type="button"
            onClick={handleDelete}
            disabled={isPending}
            className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-danger transition-colors hover:bg-danger/10 disabled:opacity-60"
          >
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
        <p className="rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-warning">
          This note was linked to a task that is no longer available.
        </p>
      )}
      {linkedVocabMissing && (
        <p className="rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-warning">
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
        <div className="mb-2 inline-flex rounded-md border border-border p-0.5">
          <button
            type="button"
            onClick={() => setMode('edit')}
            aria-pressed={mode === 'edit'}
            className={`rounded px-3 py-1 text-sm font-medium transition-colors ${
              mode === 'edit'
                ? 'bg-primary text-primary-foreground'
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
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Preview
          </button>
        </div>

        {mode === 'edit' ? (
          <textarea
            value={bodyMarkdown}
            onChange={(e) => setBodyMarkdown(e.target.value)}
            rows={18}
            placeholder="Write in markdown… headings, lists, **bold**, `code`."
            aria-label="Note body (markdown)"
            className="w-full rounded-md border border-border bg-card px-3 py-2 font-mono text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        ) : (
          <div className="min-h-[20rem] rounded-md border border-border bg-card px-4 py-3">
            <MarkdownPreview markdown={bodyMarkdown} />
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending || !dirty}
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:opacity-90 disabled:opacity-50"
        >
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
