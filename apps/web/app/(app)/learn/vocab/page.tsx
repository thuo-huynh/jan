import { createClient } from '@/shared/supabase/server';
import {
  CustomVocabManager,
  type CustomVocabEntry,
} from '@/features/vocab-srs/components/CustomVocabManager';

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
  const {
    data: { user },
  } = await supabase.auth.getUser();

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

  const totalPages = count ? Math.max(1, Math.ceil(count / GLOBAL_PAGE_SIZE)) : 1;

  const prevParams = new URLSearchParams({ ...(q ? { q } : {}), page: String(page - 1) });
  const nextParams = new URLSearchParams({ ...(q ? { q } : {}), page: String(page + 1) });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Vocab &amp; Kanji Deck</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Browse the N2 reference deck and manage your own custom entries — both are blended into
          the same review queue.
        </p>
      </div>

      <CustomVocabManager initialEntries={(customEntries ?? []) as CustomVocabEntry[]} />

      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-foreground">N2 reference deck</h2>
          <form className="flex items-center gap-2" action="/learn/vocab" method="get">
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="Search word, reading, or meaning"
              className="w-64 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary"
            />
            <button
              type="submit"
              className="rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
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
              <a
                href={`/learn/vocab?${prevParams.toString()}`}
                className="rounded-md border border-border px-3 py-1.5 transition-colors hover:bg-muted"
              >
                Previous
              </a>
            )}
            {page < totalPages && (
              <a
                href={`/learn/vocab?${nextParams.toString()}`}
                className="rounded-md border border-border px-3 py-1.5 transition-colors hover:bg-muted"
              >
                Next
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
