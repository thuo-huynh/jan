import { createClient } from '@/shared/supabase/server';
import type { FlashcardItem } from '../components/FlashcardDeck';
import type { PersonalFlashcardSetSummary, SharedFlashcardDeckSummary } from '../types';

type ServerSupabaseClient = ReturnType<typeof createClient>;

type DeckEntryRow = {
  vocab_id: string;
  position: number;
};

type DeckCardVocab = {
  id: string;
  word: string;
  reading: string | null;
  meaning: string;
  example: string | null;
  is_kanji: boolean;
};

type PersonalVocabCard = DeckCardVocab & {
  set_id: string | null;
};

function sharedDeckTablesAreUnavailable(error: { code?: string; message?: string } | null) {
  return (
    error?.code === 'PGRST205' ||
    Boolean(
      error?.message &&
        /could not find the table ['\"]public\.shared_flashcard_decks['\"] in the schema cache/i.test(
          error.message
        )
    )
  );
}

/** Loads published decks plus learner-private reviewed counts without creating progress rows. */
export async function loadSharedFlashcardDecks(
  supabase: ServerSupabaseClient,
  userId: string
): Promise<SharedFlashcardDeckSummary[]> {
  const { data: deckRows, error: deckError } = await supabase
    .from('shared_flashcard_decks')
    .select(
      'id, title, description, jlpt_level, labels, shared_flashcard_deck_entries(vocab_id, position)'
    )
    .eq('is_published', true)
    .order('created_at', { ascending: false });
  // Shared decks are optional reference data. Existing learners can continue
  // using their own and global vocabulary while a new deployment waits for
  // migrations 0035–0036 to be applied.
  if (deckError) {
    if (sharedDeckTablesAreUnavailable(deckError)) return [];
    throw new Error(deckError.message);
  }

  const decks = deckRows ?? [];
  const vocabIds = Array.from(
    new Set(
      decks.flatMap((deck) =>
        ((deck.shared_flashcard_deck_entries ?? []) as DeckEntryRow[]).map(
          (entry) => entry.vocab_id
        )
      )
    )
  );
  const reviewedIds = new Set<string>();

  if (vocabIds.length > 0) {
    const { data: progressRows, error: progressError } = await supabase
      .from('user_vocab_progress')
      .select('vocab_id, srs_repetitions')
      .eq('user_id', userId)
      .in('vocab_id', vocabIds)
      .gt('srs_repetitions', 0);
    if (progressError) throw new Error(progressError.message);
    for (const row of progressRows ?? []) reviewedIds.add(row.vocab_id);
  }

  return decks
    .map((deck) => {
      const entries = (deck.shared_flashcard_deck_entries ?? []) as DeckEntryRow[];
      const cardCount = entries.length;
      return {
        id: deck.id,
        title: deck.title,
        description: deck.description,
        jlptLevel: deck.jlpt_level,
        labels: deck.labels ?? [],
        cardCount,
        reviewedCount: entries.filter((entry) => reviewedIds.has(entry.vocab_id)).length,
      };
    })
    .filter((deck) => deck.cardCount > 0);
}

/** Returns only published deck cards, ordered as the administrator arranged them. */
export async function loadSharedFlashcardDeckCards(
  supabase: ServerSupabaseClient,
  deckId: string
): Promise<{ title: string; cards: FlashcardItem[] } | null> {
  const { data: deck, error } = await supabase
    .from('shared_flashcard_decks')
    .select(
      'title, shared_flashcard_deck_entries(vocab_id, position, vocab_entries(id, word, reading, meaning, example, is_kanji))'
    )
    .eq('id', deckId)
    .eq('is_published', true)
    .maybeSingle();
  if (error) {
    if (sharedDeckTablesAreUnavailable(error)) return null;
    throw new Error(error.message);
  }
  if (!deck) return null;

  const cards = (
    (deck.shared_flashcard_deck_entries ?? []) as Array<{
      position: number;
      vocab_entries: DeckCardVocab | DeckCardVocab[] | null;
    }>
  )
    .sort((a, b) => a.position - b.position)
    .flatMap((entry) => {
      const vocab = Array.isArray(entry.vocab_entries)
        ? entry.vocab_entries[0]
        : entry.vocab_entries;
      return vocab
        ? [
            {
              id: vocab.id,
              word: vocab.word,
              reading: vocab.reading,
              meaning: vocab.meaning,
              example: vocab.example,
              isKanji: vocab.is_kanji,
              source: 'global' as const,
            },
          ]
        : [];
    });

  return { title: deck.title, cards };
}

/** Lists a learner's own vocab sets with counts without creating SRS progress. */
export async function loadPersonalFlashcardSets(
  supabase: ServerSupabaseClient,
  userId: string
): Promise<PersonalFlashcardSetSummary[]> {
  const [setsResult, entriesResult] = await Promise.all([
    supabase
      .from('vocab_sets')
      .select('id, name')
      .eq('user_id', userId)
      .order('created_at', { ascending: true }),
    supabase.from('vocab_entries').select('set_id').eq('user_id', userId).not('set_id', 'is', null),
  ]);
  if (setsResult.error) throw new Error(setsResult.error.message);
  if (entriesResult.error) throw new Error(entriesResult.error.message);

  const cardCounts = new Map<string, number>();
  for (const entry of entriesResult.data ?? []) {
    if (entry.set_id) cardCounts.set(entry.set_id, (cardCounts.get(entry.set_id) ?? 0) + 1);
  }

  return (setsResult.data ?? []).map((set) => ({
    id: set.id,
    name: set.name,
    cardCount: cardCounts.get(set.id) ?? 0,
  }));
}

/** Loads only the caller's cards from one personal vocabulary set. */
export async function loadPersonalFlashcardSetCards(
  supabase: ServerSupabaseClient,
  userId: string,
  setId: string
): Promise<{ title: string; cards: FlashcardItem[] } | null> {
  const { data: set, error: setError } = await supabase
    .from('vocab_sets')
    .select('id, name')
    .eq('id', setId)
    .eq('user_id', userId)
    .maybeSingle();
  if (setError) throw new Error(setError.message);
  if (!set) return null;

  const { data: rows, error: cardsError } = await supabase
    .from('vocab_entries')
    .select('id, word, reading, meaning, example, is_kanji, set_id')
    .eq('user_id', userId)
    .eq('set_id', set.id)
    .order('created_at', { ascending: false });
  if (cardsError) throw new Error(cardsError.message);

  const cards = ((rows ?? []) as PersonalVocabCard[]).map((row) => ({
    id: row.id,
    word: row.word,
    reading: row.reading,
    meaning: row.meaning,
    example: row.example,
    isKanji: row.is_kanji,
    source: 'custom' as const,
  }));

  return { title: set.name, cards };
}
