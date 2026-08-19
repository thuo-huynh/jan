import Link from 'next/link';
import { Flame, Layers } from 'lucide-react';
import { createClient, getAuthedUser } from '@/shared/supabase/server';
import {
  CustomVocabManager,
  type CustomVocabEntry,
} from '@/features/vocab-srs/components/CustomVocabManager';
import { loadDueReviewQueue } from '@/features/vocab-srs/lib/queue';

/**
 * Vocab/kanji deck management page (T051) — browse the global N2 reference
 * deck (read-only, server-rendered, paginated) and manage the caller's own
 * custom entries (add/edit/delete, delegated to the client CustomVocabManager
 * so mutations don't require a full page reload).
 */

const GLOBAL_PAGE_SIZE = 40;

interface VocabPageProps {
  searchParams: { q?: string; page?: string };
}

export default async function VocabDeckPage({ searchParams }: VocabPageProps) {
  const supabase = createClient();
  const user = await getAuthedUser();

  const q = searchParams.q?.trim() ?? '';
  const page = Math.max(1, Number(searchParams.page ?? '1') || 1);
  const from = (page - 1) * GLOBAL_PAGE_SIZE;
  const to = from + GLOBAL_PAGE_SIZE - 1;

  let globalQuery = supabase
    .from('vocab_entries')
    .select('id, word, reading, meaning, is_kanji', { count: 'exact' })
    .is('user_id', null)
    .order('word', { ascending: true })
    .range(from, to);

  if (q) {
    globalQuery = globalQuery.or(`word.ilike.%${q}%,reading.ilike.%${q}%,meaning.ilike.%${q}%`);
  }

  const { data: globalEntries, count } = await globalQuery;

  const { data: customEntries } = user
    ? await supabase
        .from('vocab_entries')
        .select('id, word, reading, meaning, example, jlpt_level, is_kanji')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
    : { data: [] as CustomVocabEntry[] };

  // "X due today" summary (below) reuses the same due/weak logic the review
  // session's API route runs, so this count never drifts from what actually
  // shows up when the user clicks through — see features/vocab-srs/lib/queue.ts.
  const dueQueue = user ? await loadDueReviewQueue(supabase, user.id) : [];
  const dueCount = dueQueue.length;
  const weakCount = dueQueue.filter((s) => s.item.isWeak).length;

  const totalPages = count ? Math.max(1, Math.ceil(count / GLOBAL_PAGE_SIZE)) : 1;

  const prevParams = new URLSearchParams({ ...(q ? { q } : {}), page: String(page - 1) });
  const nextParams = new URLSearchParams({ ...(q ? { q } : {}), page: String(page + 1) });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Vocab &amp; Kanji Deck</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Browse the N2 reference deck and manage your own custom entries — both are blended into
          the same review queue.
        </p>
      </div>

      {user && (
        <div className="card flex flex-wrap items-center justify-between gap-4 p-4 sm:p-5">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <Layers className="h-5 w-5 text-primary" aria-hidden="true" />
            </div>
            <div>
              <p className="text-2xl font-bold tracking-tight text-foreground">
                {dueCount}
                <span className="ml-1.5 text-sm font-normal text-muted-foreground">
                  {dueCount === 1 ? 'card due today' : 'cards due today'}
                </span>
              </p>
              {weakCount > 0 && (
                <p className="mt-0.5 flex items-center gap-1 text-xs text-danger">
                  <Flame className="h-3 w-3" aria-hidden="true" />
                  {weakCount} weak {weakCount === 1 ? 'item needs' : 'items need'} extra practice
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Link href="/learn/vocab/flashcards" className="btn-outline">
              Study flashcards
            </Link>
            <Link href="/learn/review" className={dueCount > 0 ? 'btn-primary' : 'btn-outline'}>
              {dueCount > 0 ? 'Start review' : 'Review queue'}
            </Link>
          </div>
        </div>
      )}

      <CustomVocabManager initialEntries={(customEntries ?? []) as CustomVocabEntry[]} />

      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-lg font-semibold tracking-tight text-foreground">N2 reference deck</h2>
          <form className="flex items-center gap-2" action="/learn/vocab" method="get">
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="Search word, reading, or meaning"
              aria-label="Search word, reading, or meaning"
              className="input-field w-64"
            />
            <button type="submit" className="btn-outline">
              Search
            </button>
          </form>
        </div>

        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Word</th>
                <th className="px-3 py-2 font-medium">Reading</th>
                <th className="px-3 py-2 font-medium">Meaning</th>
                <th className="px-3 py-2 font-medium">Type</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(globalEntries ?? []).map((entry) => (
                <tr key={entry.id} className="bg-card">
                  <td className="px-3 py-2 font-jp text-foreground">{entry.word}</td>
                  <td className="px-3 py-2 font-jp text-muted-foreground">{entry.reading}</td>
                  <td className="px-3 py-2 text-foreground">{entry.meaning}</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {entry.is_kanji ? 'kanji' : 'vocab'} · N2
                  </td>
                </tr>
              ))}
              {(globalEntries ?? []).length === 0 && (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">
                    No matching entries.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <a href={`/learn/vocab?${prevParams.toString()}`} className="btn-outline h-9 px-3 text-sm">
                Previous
              </a>
            )}
            {page < totalPages && (
              <a href={`/learn/vocab?${nextParams.toString()}`} className="btn-outline h-9 px-3 text-sm">
                Next
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
