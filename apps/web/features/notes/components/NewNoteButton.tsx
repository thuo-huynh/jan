'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/shared/supabase/client';

/**
 * Creates a blank note directly via the browser Supabase client (RLS-scoped
 * insert, no API route) and navigates to its detail/editor page. There is no
 * separate "create note" route in tasks.md (only the list page and the
 * `[noteId]` detail/editor page are specced), so note creation happens here
 * and the full edit form takes over immediately after.
 */
export function NewNoteButton() {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    if (creating) return;
    setCreating(true);
    setError(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError('You must be signed in.');
      setCreating(false);
      return;
    }

    const { data, error: insertError } = await supabase
      .from('notes')
      .insert({ user_id: user.id, title: 'Untitled note', body_markdown: '' })
      .select('id')
      .single();

    setCreating(false);

    if (insertError || !data) {
      setError(insertError?.message ?? 'Could not create note.');
      return;
    }

    router.push(`/notes/${data.id}`);
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleCreate}
        disabled={creating}
        className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:opacity-90 disabled:opacity-60"
      >
        {creating ? 'Creating…' : '+ New note'}
      </button>
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  );
}
