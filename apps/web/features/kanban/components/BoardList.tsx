'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { LayoutGrid, Trash2 } from 'lucide-react';
import { createClient } from '@/shared/supabase/client';
import { useConfirm } from '@/shared/hooks/useConfirm';
import { boardSchema } from '@/shared/validation/schemas';
import { DEFAULT_COLUMN_NAMES, type BoardSummary } from '../types';

interface BoardListProps {
  initialBoards: BoardSummary[];
}

/**
 * Client-side list + create form for boards (T031). Mutations go straight to
 * the browser Supabase client per the project's architecture convention (no
 * `app/api/boards/**` route handlers exist for Kanban) — RLS is the
 * authorization boundary.
 *
 * T040: board creation seeds the four default columns (Todo/In Progress/In
 * Review/Done) as a second insert right after the board row is created.
 * This isn't wrapped in a DB transaction (no server route to host one in
 * this architecture) — if the column insert fails after the board insert
 * succeeds, the user stays on this page (rather than being navigated into a
 * columnless board) and is warned that they can add columns from the board
 * page itself, which never leaves them stuck.
 */
export function BoardList({ initialBoards }: BoardListProps) {
  const router = useRouter();
  const [boards, setBoards] = useState<BoardSummary[]>(initialBoards);
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { confirm, confirmDialog } = useConfirm();

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const parsed = boardSchema.safeParse({ name });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Invalid board name.');
      return;
    }

    setSubmitting(true);
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSubmitting(false);
      setError('You must be signed in to create a board.');
      return;
    }

    const { data: board, error: boardError } = await supabase
      .from('boards')
      .insert({ user_id: user.id, name: parsed.data.name })
      .select('id, user_id, name, created_at')
      .single();

    if (boardError || !board) {
      setSubmitting(false);
      setError(boardError?.message ?? 'Could not create board.');
      return;
    }

    const { error: columnsError } = await supabase.from('columns').insert(
      DEFAULT_COLUMN_NAMES.map((columnName, index) => ({
        board_id: board.id,
        name: columnName,
        position: index,
      })),
    );

    setSubmitting(false);
    setName('');
    setBoards((prev) => [board, ...prev]);

    if (columnsError) {
      setError('Board created, but default columns could not be added. Add columns from the board page.');
      return;
    }

    router.push(`/boards/${board.id}`);
  }

  async function handleDelete(boardId: string) {
    const ok = await confirm({
      title: 'Delete this board and all of its tasks?',
      description: 'This cannot be undone.',
    });
    if (!ok) return;
    setDeletingId(boardId);
    const supabase = createClient();
    const { error: deleteError } = await supabase.from('boards').delete().eq('id', boardId);
    setDeletingId(null);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    setBoards((prev) => prev.filter((b) => b.id !== boardId));
  }

  return (
    <div className="space-y-6">
      {confirmDialog}
      <div className="card">
        <h2 className="text-sm font-semibold text-foreground">Create a board</h2>
        <form className="mt-3 flex flex-col gap-3 sm:flex-row" onSubmit={handleCreate}>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. N2 Study Sprint"
            aria-label="Board name"
            className="input-field flex-1"
          />
          <button type="submit" disabled={submitting} className="btn-primary whitespace-nowrap">
            {submitting ? 'Creating…' : 'Create board'}
          </button>
        </form>
        {error && <p className="error-text">{error}</p>}
      </div>

      {boards.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border p-10 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <LayoutGrid className="h-6 w-6 text-primary" aria-hidden="true" />
          </div>
          <p className="max-w-xs text-sm text-muted-foreground">
            No boards yet. Create your first board above to start tracking tasks.
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {boards.map((board) => (
            <li key={board.id} className="card-interactive group relative hover:border-primary/40">
              <Link href={`/boards/${board.id}`} className="block">
                <h3 className="truncate pr-6 text-sm font-semibold text-foreground">{board.name}</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Created {new Date(board.created_at).toLocaleDateString()}
                </p>
              </Link>
              <button
                type="button"
                onClick={() => handleDelete(board.id)}
                disabled={deletingId === board.id}
                aria-label={`Delete board ${board.name}`}
                className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded text-muted-foreground opacity-0 transition-opacity hover:bg-danger/10 hover:text-danger focus-visible:opacity-100 group-hover:opacity-100 disabled:opacity-40"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
