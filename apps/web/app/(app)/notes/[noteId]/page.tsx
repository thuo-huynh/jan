import { notFound } from 'next/navigation';
import { createClient } from '@/shared/supabase/server';
import { NoteEditor } from '@/features/notes/components/NoteEditor';
import type { LinkedItemInfo, Note } from '@/features/notes/lib/types';

/**
 * Note detail/editor page (T079). Server Component: fetches the note (RLS
 * scopes this to the owner — a guessed/foreign id yields no row, handled as
 * 404 same as a missing one) plus everything NoteEditor's pickers need
 * (folder suggestions, the user's tasks, readable vocab entries), and
 * resolves the current link targets for T084's graceful-missing-link
 * display. All mutations happen client-side from NoteEditor via the browser
 * Supabase client.
 */
export default async function NoteDetailPage({ params }: { params: { noteId: string } }) {
  const supabase = createClient();

  const { data: note, error } = await supabase
    .from('notes')
    .select('*')
    .eq('id', params.noteId)
    .single();

  if (error || !note) {
    notFound();
  }

  const typedNote = note as Note;

  const [{ data: folderRows }, { data: vocabRows }] = await Promise.all([
    supabase.from('notes').select('folder').not('folder', 'is', null),
    supabase
      .from('vocab_entries')
      .select('id, word, meaning')
      .order('word', { ascending: true })
      .limit(300),
  ]);

  const folderOptions = Array.from(
    new Set(
      (folderRows ?? [])
        .map((r: { folder: string | null }) => r.folder)
        .filter((f: string | null): f is string => Boolean(f)),
    ),
  ).sort();

  // T084: resolve the current link targets so the editor can show a label
  // instead of a bare id, and flag the (normally-impossible-thanks-to-
  // ON-DELETE-SET-NULL, but still handled) case where the id is set but the
  // row it points to is gone.
  let linkedVocabInfo: LinkedItemInfo | null = null;
  let linkedVocabMissing = false;
  if (typedNote.linked_vocab_id) {
    const { data } = await supabase
      .from('vocab_entries')
      .select('id, word, meaning')
      .eq('id', typedNote.linked_vocab_id)
      .maybeSingle();
    if (data) {
      linkedVocabInfo = { id: data.id, label: `${data.word} — ${data.meaning}` };
    } else {
      linkedVocabMissing = true;
    }
  }

  return (
    <NoteEditor
      note={typedNote}
      folderOptions={folderOptions}
      vocabOptions={vocabRows ?? []}
      linkedVocabInfo={linkedVocabInfo}
      linkedVocabMissing={linkedVocabMissing}
    />
  );
}
