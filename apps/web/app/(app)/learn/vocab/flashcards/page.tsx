import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { createClient, getAuthedUser } from '@/shared/supabase/server';
import { FlashcardCatalog } from '@/features/vocab-srs/components/FlashcardCatalog';
import { FlashcardDeck, type FlashcardItem } from '@/features/vocab-srs/components/FlashcardDeck';
import { loadDueReviewQueue } from '@/features/vocab-srs/lib/queue';
import {
  loadSharedFlashcardDeckCards,
  loadSharedFlashcardDecks,
} from '@/features/vocab-srs/lib/sharedFlashcardDecks';

type Source = 'all' | 'custom' | 'global';

interface FlashcardsPageProps {
  searchParams: { deck?: string; source?: string; q?: string };
}

const SOURCE_TABS: { value: Source; label: string }[] = [
  { value: 'all', label: 'Tất cả' },
  { value: 'custom', label: 'Từ của tôi' },
  { value: 'global', label: 'Kho dùng chung' },
];

async function loadSourceCards(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  source: Source,
  q: string
) {
  const cards: FlashcardItem[] = [];
  if (source !== 'global') {
    let query = supabase
      .from('vocab_entries')
      .select('id, word, reading, meaning, example, is_kanji')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (q) query = query.or(`word.ilike.%${q}%,reading.ilike.%${q}%,meaning.ilike.%${q}%`);
    const { data } = await query;
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
    let query = supabase
      .from('vocab_entries')
      .select('id, word, reading, meaning, example, is_kanji')
      .is('user_id', null)
      .order('word', { ascending: true });
    if (q) query = query.or(`word.ilike.%${q}%,reading.ilike.%${q}%,meaning.ilike.%${q}%`);
    const { data } = await query;
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
  return cards;
}

export default async function FlashcardsPage({ searchParams }: FlashcardsPageProps) {
  const supabase = createClient();
  const user = await getAuthedUser();
  if (!user) redirect('/login');

  const deckId = searchParams.deck?.trim() ?? '';
  const source: Source | null =
    searchParams.source === 'custom' ||
    searchParams.source === 'global' ||
    searchParams.source === 'all'
      ? searchParams.source
      : null;
  const q = searchParams.q?.trim() ?? '';

  if (deckId) {
    const deck = await loadSharedFlashcardDeckCards(supabase, deckId);
    if (!deck) redirect('/learn/vocab/flashcards');
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <Link
            href="/learn/vocab/flashcards"
            className="section-link inline-flex items-center gap-1"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Về Flashcards
          </Link>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {deck.title}
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Chạm để lật thẻ, vuốt ngang hoặc dùng phím mũi tên để chuyển.
          </p>
        </div>
        <FlashcardDeck cards={deck.cards} />
      </div>
    );
  }

  if (source) {
    const cards = await loadSourceCards(supabase, user.id, source, q);
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <Link
            href="/learn/vocab/flashcards"
            className="section-link inline-flex items-center gap-1"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Về Flashcards
          </Link>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Luyện thẻ tự do
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Lật thẻ theo tốc độ của riêng bạn — không chấm điểm, chỉ luyện tập.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-1 rounded-full border border-border p-1">
            {SOURCE_TABS.map((tab) => (
              <Link
                key={tab.value}
                href={`/learn/vocab/flashcards?${new URLSearchParams({ source: tab.value, ...(q ? { q } : {}) }).toString()}`}
                className={
                  source === tab.value
                    ? 'rounded-full bg-primary px-3 py-1 text-sm font-medium text-primary-foreground'
                    : 'rounded-full px-3 py-1 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground'
                }
              >
                {tab.label}
              </Link>
            ))}
          </div>
          <form
            action="/learn/vocab/flashcards"
            method="get"
            className="flex flex-1 items-center gap-2"
          >
            <input type="hidden" name="source" value={source} />
            <input
              name="q"
              defaultValue={q}
              placeholder="Lọc theo từ, cách đọc, hoặc nghĩa"
              aria-label="Lọc theo từ, cách đọc, hoặc nghĩa"
              className="input-field h-9 max-w-xs flex-1 text-sm"
            />
            <button type="submit" className="btn-outline h-9 px-3 text-sm">
              Áp dụng
            </button>
          </form>
        </div>
        <FlashcardDeck cards={cards} />
      </div>
    );
  }

  const [decks, dueQueue, globalCount, customCount, personalSetCount] = await Promise.all([
    loadSharedFlashcardDecks(supabase, user.id),
    loadDueReviewQueue(supabase, user.id),
    supabase.from('vocab_entries').select('id', { count: 'exact', head: true }).is('user_id', null),
    supabase
      .from('vocab_entries')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id),
    supabase.from('vocab_sets').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
  ]);

  return (
    <FlashcardCatalog
      decks={decks}
      totalCardCount={(globalCount.count ?? 0) + (customCount.count ?? 0)}
      dueCount={dueQueue.length}
      personalSetCount={personalSetCount.count ?? 0}
    />
  );
}
