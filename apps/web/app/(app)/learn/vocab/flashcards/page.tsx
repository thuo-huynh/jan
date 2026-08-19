import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { createClient, getAuthedUser } from '@/shared/supabase/server';
import { FlashcardDeck, type FlashcardItem } from '@/features/vocab-srs/components/FlashcardDeck';

/**
 * Free-flip flashcard study mode over the vocab deck (Quizlet-style) —
 * distinct from the graded SM2 review session at /learn/review. Server
 * Component: fetches + filters the deck (source/search), the client
 * FlashcardDeck owns flip/navigate/shuffle state.
 */

type Source = 'all' | 'custom' | 'global';

interface FlashcardsPageProps {
  searchParams: { source?: string; q?: string };
}

const SOURCE_TABS: { value: Source; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'custom', label: 'My words' },
  { value: 'global', label: 'N2 deck' },
];

export default async function FlashcardsPage({ searchParams }: FlashcardsPageProps) {
  const supabase = createClient();
  const user = await getAuthedUser();

  if (!user) {
    redirect('/login');
  }

  const source: Source =
    searchParams.source === 'custom' || searchParams.source === 'global' ? searchParams.source : 'all';
  const q = searchParams.q?.trim() ?? '';

  const cards: FlashcardItem[] = [];

  if (source !== 'global') {
    let customQuery = supabase
      .from('vocab_entries')
      .select('id, word, reading, meaning, example, is_kanji')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (q) {
      customQuery = customQuery.or(`word.ilike.%${q}%,reading.ilike.%${q}%,meaning.ilike.%${q}%`);
    }
    const { data } = await customQuery;
    for (const row of data ?? []) {
      cards.push({
        id: row.id,
        word: row.word,
        reading: row.reading,
        meaning: row.meaning,
        example: row.example,
        isKanji: row.is_kanji,
        source: 'custom',
      });
    }
  }

  if (source !== 'custom') {
    let globalQuery = supabase
      .from('vocab_entries')
      .select('id, word, reading, meaning, example, is_kanji')
      .is('user_id', null)
      .order('word', { ascending: true });
    if (q) {
      globalQuery = globalQuery.or(`word.ilike.%${q}%,reading.ilike.%${q}%,meaning.ilike.%${q}%`);
    }
    const { data } = await globalQuery;
    for (const row of data ?? []) {
      cards.push({
        id: row.id,
        word: row.word,
        reading: row.reading,
        meaning: row.meaning,
        example: row.example,
        isKanji: row.is_kanji,
        source: 'global',
      });
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href="/learn/vocab"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Back to vocab deck
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Flashcards</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Flip through your deck at your own pace — no grading, just practice.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-full border border-border p-1">
          {SOURCE_TABS.map((tab) => (
            <Link
              key={tab.value}
              href={`/learn/vocab/flashcards?${new URLSearchParams({ source: tab.value, ...(q ? { q } : {}) }).toString()}`}
              className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                source === tab.value
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>
        <form action="/learn/vocab/flashcards" method="get" className="flex flex-1 items-center gap-2">
          <input type="hidden" name="source" value={source} />
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Filter by word, reading, or meaning"
            aria-label="Filter by word, reading, or meaning"
            className="input-field h-9 max-w-xs flex-1 text-sm"
          />
          <button type="submit" className="btn-outline h-9 px-3 text-sm">
            Apply
          </button>
        </form>
      </div>

      <FlashcardDeck key={`${source}-${q}`} cards={cards} />
    </div>
  );
}
