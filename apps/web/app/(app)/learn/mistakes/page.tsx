import { redirect } from 'next/navigation';
import { createClient, getAuthedUser } from '@/shared/supabase/server';
import { MistakeNotebookManager } from '@/features/mistakes/components/MistakeNotebookManager';
import type { GrammarLinkOption, MistakeEntry, VocabLinkOption } from '@/features/mistakes/types';

/**
 * Mistake notebook page (T065). Server Component fetches the signed-in
 * user's mistake_notebook entries plus the vocab/grammar option lists the
 * link picker needs; filter/form/row interactivity lives in the client
 * MistakeNotebookManager.
 */
export default async function MistakesPage() {
  const supabase = createClient();
  const user = await getAuthedUser();

  if (!user) {
    redirect('/login');
  }

  const [{ data: mistakes }, { data: vocabRows }, { data: grammarRows }] = await Promise.all([
    supabase.from('mistake_notebook').select('*').order('created_at', { ascending: false }),
    supabase.from('vocab_entries').select('id, word, meaning').order('word', { ascending: true }).limit(500),
    supabase
      .from('grammar_points')
      .select('id, pattern, meaning')
      .order('pattern', { ascending: true })
      .limit(500),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Sổ lỗi sai</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Ghi lại lỗi sai, liên kết với từ vựng hoặc ngữ pháp, và đưa thẳng vào hàng đợi ôn tập SRS.
        </p>
      </div>

      <MistakeNotebookManager
        initialMistakes={(mistakes ?? []) as MistakeEntry[]}
        vocabOptions={(vocabRows ?? []) as VocabLinkOption[]}
        grammarOptions={(grammarRows ?? []) as GrammarLinkOption[]}
      />
    </div>
  );
}
