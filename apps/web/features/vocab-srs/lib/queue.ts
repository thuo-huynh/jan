import { createClient } from '@/shared/supabase/server';
import { isWeakItem, type SrsState } from '@/shared/srs/sm2';

/**
 * Shared "due today" review queue loader — extracted from
 * `GET /api/review-queue` (app/api/review-queue/route.ts) so the vocab deck
 * page (T-new: "X due today" summary card) can show accurate due/weak counts
 * without re-deriving the due/weak logic in a second place that could drift
 * from the route's own definition of "due". The route still owns
 * weakOnly-filtering + sort order (those only matter for the actual review
 * session), this loader just returns every due item, unsorted, each already
 * flagged `isWeak`.
 */
export interface ReviewQueueItem {
  itemType: 'vocab' | 'grammar';
  itemId: string;
  dueDate: string;
  isKanji?: boolean;
  isCustom?: boolean;
  isWeak?: boolean;
  word?: string;
  reading?: string | null;
  meaning?: string;
  example?: string | null;
  jlptLevel?: string | null;
  pattern?: string;
  connectionForm?: string | null;
  formalityNuance?: string | null;
  exampleSentences?: string[];
  frequencyTag?: string | null;
}

export interface SortableQueueItem {
  item: ReviewQueueItem;
  failCount: number;
  ease: number;
}

interface VocabProgressRow {
  srs_due_date: string;
  srs_interval: number;
  srs_ease: number | string;
  srs_repetitions: number;
  fail_count: number;
}

interface GrammarStatusRow {
  srs_due_date: string | null;
  srs_interval: number | null;
  srs_ease: number | string | null;
  srs_repetitions: number | null;
  fail_count: number | null;
}

type ServerSupabaseClient = ReturnType<typeof createClient>;

export async function loadDueReviewQueue(
  supabase: ServerSupabaseClient,
  userId: string,
): Promise<SortableQueueItem[]> {
  const today = new Date().toISOString().slice(0, 10);
  const sortable: SortableQueueItem[] = [];

  const { data: globalVocab, error: globalVocabError } = await supabase
    .from('vocab_entries')
    .select(
      'id, word, reading, meaning, example, jlpt_level, is_kanji, user_vocab_progress(srs_due_date, srs_interval, srs_ease, srs_repetitions, fail_count)',
    )
    .is('user_id', null);
  if (globalVocabError) throw new Error(globalVocabError.message);

  for (const row of globalVocab ?? []) {
    const progressRows: VocabProgressRow[] = Array.isArray(row.user_vocab_progress)
      ? row.user_vocab_progress
      : row.user_vocab_progress
        ? [row.user_vocab_progress]
        : [];
    const progress = progressRows[0] ?? null;
    const due = !progress || progress.srs_due_date <= today;
    if (!due) continue;

    let weak = false;
    let failCount = 0;
    let ease = 0;
    if (progress) {
      const state: SrsState = {
        interval: progress.srs_interval,
        ease: Number(progress.srs_ease),
        repetitions: progress.srs_repetitions,
        failCount: progress.fail_count,
      };
      weak = isWeakItem(state);
      failCount = state.failCount;
      ease = state.ease;
    }

    sortable.push({
      failCount,
      ease,
      item: {
        itemType: 'vocab',
        itemId: row.id,
        dueDate: progress?.srs_due_date ?? today,
        isKanji: row.is_kanji,
        isCustom: false,
        isWeak: weak,
        word: row.word,
        reading: row.reading,
        meaning: row.meaning,
        example: row.example,
        jlptLevel: row.jlpt_level,
      },
    });
  }

  const { data: customVocab, error: customVocabError } = await supabase
    .from('vocab_entries')
    .select(
      'id, word, reading, meaning, example, jlpt_level, is_kanji, srs_due_date, srs_interval, srs_ease, srs_repetitions, fail_count',
    )
    .eq('user_id', userId)
    .lte('srs_due_date', today);
  if (customVocabError) throw new Error(customVocabError.message);

  for (const row of customVocab ?? []) {
    const state: SrsState = {
      interval: row.srs_interval,
      ease: Number(row.srs_ease),
      repetitions: row.srs_repetitions,
      failCount: row.fail_count,
    };
    const weak = isWeakItem(state);

    sortable.push({
      failCount: state.failCount,
      ease: state.ease,
      item: {
        itemType: 'vocab',
        itemId: row.id,
        dueDate: row.srs_due_date,
        isKanji: row.is_kanji,
        isCustom: true,
        isWeak: weak,
        word: row.word,
        reading: row.reading,
        meaning: row.meaning,
        example: row.example,
        jlptLevel: row.jlpt_level,
      },
    });
  }

  const { data: grammarPoints, error: grammarError } = await supabase
    .from('grammar_points')
    .select(
      'id, user_id, pattern, meaning, connection_form, formality_nuance, example_sentences, frequency_tag, user_grammar_status(srs_due_date, srs_interval, srs_ease, srs_repetitions, fail_count)',
    )
    .or(`user_id.is.null,user_id.eq.${userId}`);
  if (grammarError) throw new Error(grammarError.message);

  for (const row of grammarPoints ?? []) {
    const statusRows: GrammarStatusRow[] = Array.isArray(row.user_grammar_status)
      ? row.user_grammar_status
      : row.user_grammar_status
        ? [row.user_grammar_status]
        : [];
    const status = statusRows[0] ?? null;
    const due = !status || !status.srs_due_date || status.srs_due_date <= today;
    if (!due) continue;

    let weak = false;
    let failCount = 0;
    let ease = 0;
    if (status && status.srs_ease != null) {
      const state: SrsState = {
        interval: status.srs_interval ?? 0,
        ease: Number(status.srs_ease),
        repetitions: status.srs_repetitions ?? 0,
        failCount: status.fail_count ?? 0,
      };
      weak = isWeakItem(state);
      failCount = state.failCount;
      ease = state.ease;
    }

    sortable.push({
      failCount,
      ease,
      item: {
        itemType: 'grammar',
        itemId: row.id,
        dueDate: status?.srs_due_date ?? today,
        isCustom: row.user_id !== null,
        isWeak: weak,
        pattern: row.pattern,
        meaning: row.meaning,
        connectionForm: row.connection_form,
        formalityNuance: row.formality_nuance,
        exampleSentences: row.example_sentences,
        frequencyTag: row.frequency_tag,
      },
    });
  }

  return sortable;
}
