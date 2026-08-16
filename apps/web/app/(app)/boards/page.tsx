import { redirect } from 'next/navigation';
import { createClient, getAuthedUser } from '@/shared/supabase/server';
import { BoardList } from '@/features/kanban/components/BoardList';

/**
 * Board list page (T031). Server Component fetches the signed-in user's
 * boards; the create/delete interactivity (including T040's default-column
 * seeding) lives in the `BoardList` Client Component, which talks to
 * Supabase directly under RLS.
 */
export default async function BoardsPage() {
  const supabase = createClient();
  const user = await getAuthedUser();

  if (!user) {
    redirect('/login');
  }

  const { data: boards } = await supabase
    .from('boards')
    .select('id, user_id, name, created_at')
    .order('created_at', { ascending: false });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-foreground">Boards</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Organize your tasks into Kanban boards.
        </p>
      </div>
      <BoardList initialBoards={boards ?? []} />
    </div>
  );
}
