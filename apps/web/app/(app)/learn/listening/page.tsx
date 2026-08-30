import { redirect } from 'next/navigation';
import { createClient, getAuthedUser } from '@/shared/supabase/server';
import { ListeningLogManager } from '@/features/reading-listening/components/ListeningLogManager';
import { SessionStats } from '@/features/reading-listening/components/SessionStats';
import type { ListeningLog } from '@/features/reading-listening/types';

/**
 * Listening log entry form + history table (T058). Server Component fetches
 * the signed-in user's listening_logs (RLS-scoped); form/history
 * interactivity lives in the client ListeningLogManager.
 */
export default async function ListeningLogPage() {
  const supabase = createClient();
  const user = await getAuthedUser();

  if (!user) {
    redirect('/login');
  }

  const { data: logs } = await supabase
    .from('listening_logs')
    .select('*')
    .order('practiced_at', { ascending: false });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="page-heading">Nghe</h1>
        <p className="page-intro">
          Ghi lại buổi nghe, shadowing hoặc podcast để thấy nhịp luyện tập của chính bạn.
        </p>
      </div>

      <SessionStats logs={(logs ?? []) as ListeningLog[]} />

      <ListeningLogManager initialLogs={(logs ?? []) as ListeningLog[]} />
    </div>
  );
}
