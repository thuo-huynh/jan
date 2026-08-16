import { redirect } from 'next/navigation';
import { createClient } from '@/shared/supabase/server';
import { MockTestManager } from '@/features/mock-tests/components/MockTestManager';
import { ScoreTrendChart } from '@/features/mock-tests/components/ScoreTrendChart';
import { ExamDateSetting } from '@/features/mock-tests/components/ExamDateSetting';
import type { MockTestResult } from '@/features/mock-tests/types';

/**
 * Mock test score entry form (T061) + trend chart (T062) + exam date
 * setting/countdown (T063/T064). Server Component fetches the signed-in
 * user's mock_test_results and study_goals.exam_date (RLS-scoped).
 */
export default async function MockTestsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const [{ data: results }, { data: goals }] = await Promise.all([
    supabase.from('mock_test_results').select('*').order('test_date', { ascending: true }),
    supabase.from('study_goals').select('exam_date').eq('user_id', user.id).maybeSingle(),
  ]);

  const mockTestResults = (results ?? []) as MockTestResult[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Mock Tests</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Track practice/past-paper results by section and count down to your exam date.
        </p>
      </div>

      <ExamDateSetting initialExamDate={goals?.exam_date ?? null} />

      <ScoreTrendChart results={mockTestResults} />

      <MockTestManager initialResults={mockTestResults} />
    </div>
  );
}
