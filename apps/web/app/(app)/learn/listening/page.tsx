import { redirect } from 'next/navigation';
import { createClient, getAuthedUser } from '@/shared/supabase/server';
import { ListeningLogManager } from '@/features/reading-listening/components/ListeningLogManager';
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Listening Log (聴解)</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Log listening/shadowing practice sessions and track comprehension over time.
        </p>
      </div>

      <ListeningLogManager initialLogs={(logs ?? []) as ListeningLog[]} />
    </div>
  );
}
