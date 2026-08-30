import { redirect } from 'next/navigation';
import { Headphones } from 'lucide-react';
import { createClient, getAuthedUser } from '@/shared/supabase/server';
import { ListeningLogManager } from '@/features/reading-listening/components/ListeningLogManager';
import { SessionStats } from '@/features/reading-listening/components/SessionStats';
import type { ListeningLog } from '@/features/reading-listening/types';
import { LearningHero } from '@/shared/components/LearningHero';

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
      <LearningHero
        icon={Headphones}
        title="Nghe"
        description="Lưu lại podcast, shadowing và những lần lắng nghe để thấy nhịp luyện tập của riêng bạn."
        tone="blue"
        meta={`${(logs ?? []).length} buổi nghe đã lưu`}
      />

      <SessionStats logs={(logs ?? []) as ListeningLog[]} />

      <ListeningLogManager initialLogs={(logs ?? []) as ListeningLog[]} />
    </div>
  );
}
