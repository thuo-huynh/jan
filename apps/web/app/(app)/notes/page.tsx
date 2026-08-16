import { Suspense } from 'react';
import { createClient } from '@/shared/supabase/server';
import { NoteCard } from '@/features/notes/components/NoteCard';
import { NoteFilters } from '@/features/notes/components/NoteFilters';
import { NewNoteButton } from '@/features/notes/components/NewNoteButton';
import type { Note } from '@/features/notes/lib/types';

/**
 * Notes list/search page (T078) + full-text search bar (T082).
 *
 * Server Component: fetches initial data via the server Supabase client,
 * filtered by URL search params (`q`, `folder`, `tag`, `pinned`) that
 * NoteFilters (a Client Component) writes via router.push. Full-text search
 * uses `.textSearch('search_vector', q, ...)` — the generated column is
 * built with the 'simple' text search config (apps/supabase/migrations/
 * 0008_notes.sql), so the query here matches that config rather than
 * 'english'.
 */
export default async function NotesPage({
  searchParams,
}: {
  searchParams: { q?: string; folder?: string; tag?: string; pinned?: string };
}) {
  const supabase = createClient();
  const { q, folder, tag, pinned } = searchParams;

  let notesQuery = supabase
    .from('notes')
    .select('*')
    .order('pinned', { ascending: false })
    .order('updated_at', { ascending: false });

  if (q && q.trim()) {
    notesQuery = notesQuery.textSearch('search_vector', q.trim(), {
      type: 'websearch',
      config: 'simple',
    });
  }
  if (folder) {
    notesQuery = notesQuery.eq('folder', folder);
  }
  if (tag) {
    notesQuery = notesQuery.contains('tags', [tag]);
  }
  if (pinned === '1') {
    notesQuery = notesQuery.eq('pinned', true);
  }

  const [{ data: notes, error }, { data: allNotesMeta }] = await Promise.all([
    notesQuery,
    supabase.from('notes').select('folder, tags'),
  ]);

  const folderOptions = Array.from(
    new Set(
      (allNotesMeta ?? [])
        .map((n: { folder: string | null }) => n.folder)
        .filter((f: string | null): f is string => Boolean(f)),
    ),
  ).sort();
  const tagOptions = Array.from(
    new Set((allNotesMeta ?? []).flatMap((n: { tags: string[] }) => n.tags ?? [])),
  ).sort();

  const hasActiveFilters = Boolean(q || folder || tag || pinned);
  const noteList = (notes as Note[] | null) ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Notes</h1>
          <p className="text-sm text-muted-foreground">
            Freeform markdown notes — organize by folder/tags, pin favorites, link to tasks or
            vocab.
          </p>
        </div>
        <NewNoteButton />
      </div>

      <Suspense fallback={<div className="h-10" />}>
        <NoteFilters folderOptions={folderOptions} tagOptions={tagOptions} />
      </Suspense>

      {error && (
        <p className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
          Could not load notes: {error.message}
        </p>
      )}

      {!error && noteList.length === 0 && (
        <p className="rounded-md border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
          {hasActiveFilters ? 'No notes match these filters.' : 'No notes yet — create your first one.'}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {noteList.map((note) => (
          <NoteCard key={note.id} note={note} />
        ))}
      </div>
    </div>
  );
}
