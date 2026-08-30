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
      <div className="mb-8">
        <h1 className="page-heading">Bảng công việc</h1>
        <p className="page-intro">
          Sắp xếp công việc theo bảng riêng khi bạn cần một góc quản lý sâu hơn.
        </p>
      </div>
      <BoardList initialBoards={boards ?? []} />
    </div>
  );
}
