import { redirect } from 'next/navigation';
import { createClient } from '@/shared/supabase/server';
import { ReadingLogManager } from '@/features/reading-listening/components/ReadingLogManager';
import { PassageTypeBreakdown } from '@/features/reading-listening/components/PassageTypeBreakdown';
import type { ReadingLog } from '@/features/reading-listening/types';

/**
 * Reading log entry form + history table (T057). Server Component fetches
 * the signed-in user's reading_logs (RLS-scoped); the by-passage-type
 * breakdown (T060) reads from the same data, and the form/history
 * interactivity (including T059's attach-to-SRS action) lives in the client
 * ReadingLogManager.
 */
export default async function ReadingLogPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: logs } = await supabase
    .from('reading_logs')
    .select('*')
    .order('practiced_at', { ascending: false });

  const readingLogs = (logs ?? []) as ReadingLog[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Reading Log (読解)</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Log reading practice sessions and attach unknown words straight to your SRS queue.
        </p>
      </div>

      <PassageTypeBreakdown logs={readingLogs} />

      <ReadingLogManager initialLogs={readingLogs} />
    </div>
  );
}
