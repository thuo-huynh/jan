import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/shared/supabase/server';
import { isWeakItem, type SrsState } from '@/shared/srs/sm2';

/**
 * GET /api/review-queue — T049.
 *
 * Returns the blended, due-today review queue combining vocab/kanji and
 * grammar items for the caller (contracts/api.md). "Due" means either the
 * item has never been reviewed by this user (no per-user progress row yet —
 * research.md §7 lazy-row pattern) or its recorded `srs_due_date <= today`.
 *
 * `weakOnly=true` narrows the already-due set further using `isWeakItem()`
 * from shared/srs/sm2.ts (FR-021) — it does not surface not-yet-due weak
 * items, matching this endpoint's own contract description ("the blended,
 * due-today review queue ... optionally restricted to weak items").
 */
export const dynamic = 'force-dynamic';

export interface ReviewQueueItem {
  itemType: 'vocab' | 'grammar';
  itemId: string;
  dueDate: string;
  // vocab-only fields (contracts/api.md's documented shape):
  isKanji?: boolean;
  isCustom?: boolean;
  // Additive fields beyond the minimal contract shape: the review card needs
  // display content, and fetching it per-item after the queue call would be
  // an N+1 round trip, so it's embedded here. See final report for this
  // flagged as a deliberate additive extension, not a contract deviation.
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

interface SortableItem {
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

export async function GET(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const weakOnly = request.nextUrl.searchParams.get('weakOnly') === 'true';
  const today = new Date().toISOString().slice(0, 10);

  const sortable: SortableItem[] = [];

  // ---------------------------------------------------------------------
  // Global vocab/kanji reference items, blended with the caller's own
  // per-user progress row (0 or 1 rows, RLS-scoped to auth.uid()) via
  // PostgREST embedding on the vocab_id -> user_vocab_progress relation.
  // ---------------------------------------------------------------------
  const { data: globalVocab, error: globalVocabError } = await supabase
    .from('vocab_entries')
    .select(
      'id, word, reading, meaning, example, jlpt_level, is_kanji, user_vocab_progress(srs_due_date, srs_interval, srs_ease, srs_repetitions, fail_count)',
    )
    .is('user_id', null);

  if (globalVocabError) {
    return NextResponse.json({ error: globalVocabError.message }, { status: 500 });
  }

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
    if (weakOnly && !weak) continue;

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

  // ---------------------------------------------------------------------
  // Caller's own custom vocab/kanji entries — SRS state lives directly on
  // the vocab_entries row (data-model.md), no user_vocab_progress
  // indirection needed since only that user can ever review it.
  // ---------------------------------------------------------------------
  const { data: customVocab, error: customVocabError } = await supabase
    .from('vocab_entries')
    .select(
      'id, word, reading, meaning, example, jlpt_level, is_kanji, srs_due_date, srs_interval, srs_ease, srs_repetitions, fail_count',
    )
    .eq('user_id', user.id)
    .lte('srs_due_date', today);

  if (customVocabError) {
    return NextResponse.json({ error: customVocabError.message }, { status: 500 });
  }

  for (const row of customVocab ?? []) {
    const state: SrsState = {
      interval: row.srs_interval,
      ease: Number(row.srs_ease),
      repetitions: row.srs_repetitions,
      failCount: row.fail_count,
    };
    const weak = isWeakItem(state);
    if (weakOnly && !weak) continue;

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

  // ---------------------------------------------------------------------
  // Global grammar points, blended with the caller's own SRS/status row
  // (user_grammar_status — data-model.md is explicit this table carries the
  // grammar SRS fields, not a separate table).
  // ---------------------------------------------------------------------
  const { data: grammarPoints, error: grammarError } = await supabase
    .from('grammar_points')
    .select(
      'id, pattern, meaning, connection_form, formality_nuance, example_sentences, frequency_tag, user_grammar_status(srs_due_date, srs_interval, srs_ease, srs_repetitions, fail_count)',
    )
    .is('user_id', null);

  if (grammarError) {
    return NextResponse.json({ error: grammarError.message }, { status: 500 });
  }

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
    if (weakOnly && !weak) continue;

    sortable.push({
      failCount,
      ease,
      item: {
        itemType: 'grammar',
        itemId: row.id,
        dueDate: status?.srs_due_date ?? today,
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

  if (weakOnly) {
    // Acceptance Scenario 4: "sorted by weakest first" — highest fail count
    // first, ties broken by lowest ease (closer to the floor = weaker).
    sortable.sort((a, b) => b.failCount - a.failCount || a.ease - b.ease);
  } else {
    sortable.sort((a, b) => a.item.dueDate.localeCompare(b.item.dueDate));
  }

  return NextResponse.json({ items: sortable.map((s) => s.item) });
}
