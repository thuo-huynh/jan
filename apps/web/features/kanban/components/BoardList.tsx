'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { createClient } from '@/shared/supabase/client';
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
 * succeeds, the user is warned and can retry adding columns from the board
 * page itself, which never leaves them stuck.
 */
export function BoardList({ initialBoards }: BoardListProps) {
  const router = useRouter();
  const [boards, setBoards] = useState<BoardSummary[]>(initialBoards);
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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
    }

    router.push(`/boards/${board.id}`);
  }

  async function handleDelete(boardId: string) {
    if (!window.confirm('Delete this board and all of its tasks? This cannot be undone.')) return;
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
      <div className="rounded-lg border border-border bg-card p-4">
        <h2 className="text-sm font-semibold text-foreground">Create a board</h2>
        <form className="mt-3 flex flex-col gap-3 sm:flex-row" onSubmit={handleCreate}>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. N2 Study Sprint"
            className="w-full flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary"
          />
          <button
            type="submit"
            disabled={submitting}
            className="whitespace-nowrap rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90 disabled:opacity-60"
          >
            {submitting ? 'Creating…' : 'Create board'}
          </button>
        </form>
        {error && <p className="mt-2 text-sm text-danger">{error}</p>}
      </div>

      {boards.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-10 text-center">
          <p className="text-sm text-muted-foreground">
            No boards yet. Create your first board above to start tracking tasks.
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {boards.map((board) => (
            <li
              key={board.id}
              className="group relative rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary"
            >
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
                className="absolute right-3 top-3 rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-danger focus:opacity-100 group-hover:opacity-100 disabled:opacity-40"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="h-4 w-4"
                >
                  <path
                    fillRule="evenodd"
                    d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482 41.03 41.03 0 0 0-2.365-.298V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
