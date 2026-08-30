import { redirect } from 'next/navigation';
import { createClient, getAuthedUser } from '@/shared/supabase/server';
import { ReadingTabs } from '@/features/reading-listening/components/ReadingTabs';
import { mapReadingPassage } from '@/features/reading-listening/lib/mapReadingPassage';
import type {
  ReadingPassageQuestionRecord,
  ReadingPassageRecord,
} from '@/features/reading-listening/lib/mapReadingPassage';
import type {
  QuestionProgress,
  ReadingLog,
  ReadingPassageSet,
} from '@/features/reading-listening/types';

/**
 * Reading log entry form + history table (T057) plus the passage-bank tab
 * (specs/004-reading-comprehension). Server Component fetches the
 * signed-in user's reading_logs, reading_passages, reading_passage_questions,
 * and reading_passage_sets (all RLS-scoped); tab switching and all
 * interactivity lives in the client ReadingTabs.
 */
export default async function ReadingLogPage() {
  const supabase = createClient();
  const user = await getAuthedUser();

  if (!user) {
    redirect('/login');
  }

  const [
    { data: logs },
    { data: passageRows },
    { data: questionRows },
    { data: setRows },
    { data: progressRows },
  ] = await Promise.all([
    supabase.from('reading_logs').select('*').order('practiced_at', { ascending: false }),
    supabase
      .from('reading_passages')
      .select('id, set_id, title, passage_segments, translation_vn, tip')
      .order('created_at', { ascending: false }),
    supabase
      .from('reading_passage_questions')
      .select(
        'id, passage_id, order_index, question_text, choices, correct_choice_index, explanation'
      ),
    supabase
      .from('reading_passage_sets')
      .select('id, name, created_at')
      .order('created_at', { ascending: true }),
    supabase
      .from('user_reading_question_progress')
      .select('question_id, chosen_choice_index, is_correct'),
  ]);

  const readingLogs = (logs ?? []) as ReadingLog[];
  const questionRecords = (questionRows ?? []) as ReadingPassageQuestionRecord[];
  const passages = ((passageRows ?? []) as ReadingPassageRecord[]).map((row) =>
    mapReadingPassage(row, questionRecords)
  );
  const passageSets = (setRows ?? []) as ReadingPassageSet[];
  const passageProgress = Object.fromEntries(
    (progressRows ?? []).map((row): [string, QuestionProgress] => [
      row.question_id,
      { chosenIndex: row.chosen_choice_index, isCorrect: row.is_correct },
    ])
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="page-heading">Đọc</h1>
        <p className="page-intro">
          Lưu bài đọc của riêng bạn, nhập từ HTML, Markdown hoặc CSV, rồi ghi lại những lần bạn đã
          học.
        </p>
      </div>

      <ReadingTabs
        readingLogs={readingLogs}
        passages={passages}
        passageSets={passageSets}
        passageProgress={passageProgress}
      />
    </div>
  );
}
