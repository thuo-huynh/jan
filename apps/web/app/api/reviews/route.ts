import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/shared/supabase/server';
import {
  computeNextReview,
  initialSrsState,
  type SrsResult,
  type SrsState,
  type SrsUpdate,
} from '@/shared/srs/sm2';

/**
 * POST /api/reviews — T050.
 *
 * Submits a graded SRS review for one vocab/kanji item or one grammar point.
 * The server is the sole authority on scheduling (research.md §3): it
 * resolves which row actually holds the caller's SRS state, runs
 * shared/srs/sm2.ts, persists the update, and logs the review. Never trust a
 * client-submitted interval/ease/dueDate.
 */
export const dynamic = 'force-dynamic';

type ServerSupabaseClient = ReturnType<typeof createClient>;

const reviewRequestSchema = z.object({
  itemType: z.enum(['vocab', 'grammar']),
  itemId: z.string().uuid(),
  direction: z
    .enum(['reading_to_meaning', 'kanji_recognition', 'kanji_writing_recall'])
    .nullable()
    .optional(),
  result: z.enum(['again', 'hard', 'good', 'easy']),
});

class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = reviewRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request body', issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const { itemType, itemId, result } = parsed.data;
  const direction = parsed.data.direction ?? undefined;

  let update: SrsUpdate;
  try {
    update =
      itemType === 'vocab'
        ? await reviewVocabItem(supabase, user.id, itemId, direction, result)
        : await reviewGrammarItem(supabase, user.id, itemId, direction, result);
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }

  const { error: logError } = await supabase.from('review_logs').insert({
    user_id: user.id,
    vocab_id: itemType === 'vocab' ? itemId : null,
    grammar_id: itemType === 'grammar' ? itemId : null,
    result,
  });
  if (logError) {
    return NextResponse.json({ error: logError.message }, { status: 500 });
  }

  const streak = await computeCurrentStreak(supabase, user.id);

  return NextResponse.json({
    itemType,
    itemId,
    srsInterval: update.interval,
    srsEase: update.ease,
    srsDueDate: update.dueDate,
    failCount: update.failCount,
    streak,
  });
}

function validateDirection(isKanji: boolean, direction: string | undefined) {
  if (isKanji) {
    if (direction !== 'kanji_recognition' && direction !== 'kanji_writing_recall') {
      throw new ApiError(
        400,
        'direction must be "kanji_recognition" or "kanji_writing_recall" for a kanji item',
      );
    }
  } else if (direction && direction !== 'reading_to_meaning') {
    throw new ApiError(
      400,
      'direction must be "reading_to_meaning" (or omitted) for a non-kanji vocab item',
    );
  }
}

/**
 * Resolves WHICH row holds this vocab/kanji item's SRS state (data-model.md
 * "vocab_entries" ownership note; research.md §7):
 * - `vocab_entries.user_id` non-null (the caller's own custom entry, since
 *   RLS only ever returns another user's non-null-user_id row as "not
 *   found") -> read/write SRS columns directly on that row.
 * - `vocab_entries.user_id` IS NULL (global reference row) -> read/write via
 *   `user_vocab_progress`, lazily creating that row on first review.
 */
async function reviewVocabItem(
  supabase: ServerSupabaseClient,
  userId: string,
  itemId: string,
  direction: string | undefined,
  result: SrsResult,
): Promise<SrsUpdate> {
  const { data: vocabRow, error: vocabError } = await supabase
    .from('vocab_entries')
    .select('id, user_id, is_kanji, srs_interval, srs_ease, srs_repetitions, fail_count')
    .eq('id', itemId)
    .maybeSingle();

  if (vocabError) throw new ApiError(500, vocabError.message);
  if (!vocabRow) throw new ApiError(404, 'Vocab/kanji item not found');

  validateDirection(vocabRow.is_kanji, direction);

  if (vocabRow.user_id) {
    // Owned custom entry: RLS's select policy (user_id IS NULL OR auth.uid()
    // = user_id) guarantees that if this row was returned at all with a
    // non-null user_id, that user_id === the caller's.
    const state: SrsState = {
      interval: vocabRow.srs_interval,
      ease: Number(vocabRow.srs_ease),
      repetitions: vocabRow.srs_repetitions,
      failCount: vocabRow.fail_count,
    };
    const update = computeNextReview(state, result);

    const { error: updateError } = await supabase
      .from('vocab_entries')
      .update({
        srs_due_date: update.dueDate,
        srs_interval: update.interval,
        srs_ease: update.ease,
        srs_repetitions: update.repetitions,
        fail_count: update.failCount,
      })
      .eq('id', itemId)
      .eq('user_id', userId);
    if (updateError) throw new ApiError(500, updateError.message);

    return update;
  }

  // Global reference row: per-user SRS state lives in user_vocab_progress,
  // lazily created on first review (research.md §7).
  const { data: progress, error: progressError } = await supabase
    .from('user_vocab_progress')
    .select('srs_interval, srs_ease, srs_repetitions, fail_count')
    .eq('user_id', userId)
    .eq('vocab_id', itemId)
    .maybeSingle();
  if (progressError) throw new ApiError(500, progressError.message);

  const state: SrsState = progress
    ? {
        interval: progress.srs_interval,
        ease: Number(progress.srs_ease),
        repetitions: progress.srs_repetitions,
        failCount: progress.fail_count,
      }
    : initialSrsState();
  const update = computeNextReview(state, result);

  const { error: upsertError } = await supabase.from('user_vocab_progress').upsert(
    {
      user_id: userId,
      vocab_id: itemId,
      srs_due_date: update.dueDate,
      srs_interval: update.interval,
      srs_ease: update.ease,
      srs_repetitions: update.repetitions,
      fail_count: update.failCount,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,vocab_id' },
  );
  if (upsertError) throw new ApiError(500, upsertError.message);

  return update;
}

/**
 * Grammar always goes via `user_grammar_status` (data-model.md), lazily
 * created on first status change OR first review, whichever comes first —
 * this handles the "first review" case (the "first status change" case,
 * T043, is out of this story's scope but uses the same lazy-upsert shape
 * and must take care not to clobber the srs_* columns written here).
 */
async function reviewGrammarItem(
  supabase: ServerSupabaseClient,
  userId: string,
  itemId: string,
  direction: string | undefined,
  result: SrsResult,
): Promise<SrsUpdate> {
  if (direction) {
    throw new ApiError(400, 'direction is not applicable to grammar reviews');
  }

  const { data: grammarRow, error: grammarError } = await supabase
    .from('grammar_points')
    .select('id')
    .eq('id', itemId)
    .maybeSingle();
  if (grammarError) throw new ApiError(500, grammarError.message);
  if (!grammarRow) throw new ApiError(404, 'Grammar point not found');

  const { data: status, error: statusError } = await supabase
    .from('user_grammar_status')
    .select('srs_interval, srs_ease, srs_repetitions, fail_count')
    .eq('user_id', userId)
    .eq('grammar_point_id', itemId)
    .maybeSingle();
  if (statusError) throw new ApiError(500, statusError.message);

  const state: SrsState =
    status && status.srs_ease != null
      ? {
          interval: status.srs_interval ?? 0,
          ease: Number(status.srs_ease),
          repetitions: status.srs_repetitions ?? 0,
          failCount: status.fail_count ?? 0,
        }
      : initialSrsState();
  const update = computeNextReview(state, result);

  // Only the srs_*/fail_count columns are included in this upsert payload —
  // `status`/`notes_user` are intentionally omitted so a conflict (existing
  // row) leaves them untouched, and a fresh insert falls back to their table
  // defaults ('not_started' / null) rather than this endpoint silently
  // resetting a user's mastery status or personal notes.
  const { error: upsertError } = await supabase.from('user_grammar_status').upsert(
    {
      user_id: userId,
      grammar_point_id: itemId,
      srs_due_date: update.dueDate,
      srs_interval: update.interval,
      srs_ease: update.ease,
      srs_repetitions: update.repetitions,
      fail_count: update.failCount,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,grammar_point_id' },
  );
  if (upsertError) throw new ApiError(500, upsertError.message);

  return update;
}

async function computeCurrentStreak(
  supabase: ServerSupabaseClient,
  userId: string,
): Promise<number> {
  const { data: logs } = await supabase
    .from('review_logs')
    .select('reviewed_at')
    .eq('user_id', userId)
    .order('reviewed_at', { ascending: false })
    .limit(1000);

  const days = new Set((logs ?? []).map((row: { reviewed_at: string }) => row.reviewed_at.slice(0, 10)));
  if (days.size === 0) return 0;

  let streak = 0;
  const cursor = new Date();
  for (;;) {
    const key = cursor.toISOString().slice(0, 10);
    if (days.has(key)) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}
