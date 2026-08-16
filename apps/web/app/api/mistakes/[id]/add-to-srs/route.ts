import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/shared/supabase/server';

/**
 * POST /api/mistakes/[id]/add-to-srs — T067.
 *
 * "One-click add to SRS queue" (US6 acceptance scenario 2): nudges the
 * mistake's linked vocab/grammar item's due date to today WITHOUT running it
 * through the full SM-2 "again" transition (shared/srs/sm2.ts) — that would
 * also drop ease and bump fail_count, which conflates "I want to review this
 * sooner" with "I got this wrong just now" (that path is POST /api/reviews).
 * Only `srs_due_date` is touched; a Postgres upsert whose payload omits the
 * other srs_* columns leaves them alone on conflict and falls back to table
 * defaults only on a fresh insert (research.md §7 lazy-row pattern).
 *
 * 404s if the mistake doesn't exist (RLS already scopes SELECT to the
 * owner) or if it has no vocab/grammar link at all.
 */
export const dynamic = 'force-dynamic';

type ServerSupabaseClient = ReturnType<typeof createClient>;

class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: mistake, error: mistakeError } = await supabase
    .from('mistake_notebook')
    .select('id, linked_vocab_id, linked_grammar_id')
    .eq('id', params.id)
    .maybeSingle();

  if (mistakeError) {
    return NextResponse.json({ error: mistakeError.message }, { status: 500 });
  }
  if (!mistake || (!mistake.linked_vocab_id && !mistake.linked_grammar_id)) {
    return NextResponse.json(
      { error: 'Mistake not found or has no linked vocab/grammar item' },
      { status: 404 },
    );
  }

  const today = new Date().toISOString().slice(0, 10);

  try {
    if (mistake.linked_vocab_id) {
      await nudgeVocabDueDate(supabase, user.id, mistake.linked_vocab_id, today);
      return NextResponse.json({ itemType: 'vocab', itemId: mistake.linked_vocab_id, srsDueDate: today });
    }
    await nudgeGrammarDueDate(supabase, user.id, mistake.linked_grammar_id as string, today);
    return NextResponse.json({ itemType: 'grammar', itemId: mistake.linked_grammar_id, srsDueDate: today });
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}

async function nudgeVocabDueDate(
  supabase: ServerSupabaseClient,
  userId: string,
  vocabId: string,
  today: string,
) {
  const { data: vocabRow, error: vocabError } = await supabase
    .from('vocab_entries')
    .select('id, user_id')
    .eq('id', vocabId)
    .maybeSingle();
  if (vocabError) throw new ApiError(500, vocabError.message);
  if (!vocabRow) throw new ApiError(404, 'Linked vocab/kanji item no longer exists');

  if (vocabRow.user_id) {
    const { error } = await supabase
      .from('vocab_entries')
      .update({ srs_due_date: today })
      .eq('id', vocabId)
      .eq('user_id', userId);
    if (error) throw new ApiError(500, error.message);
    return;
  }

  const { error } = await supabase
    .from('user_vocab_progress')
    .upsert({ user_id: userId, vocab_id: vocabId, srs_due_date: today }, { onConflict: 'user_id,vocab_id' });
  if (error) throw new ApiError(500, error.message);
}

async function nudgeGrammarDueDate(
  supabase: ServerSupabaseClient,
  userId: string,
  grammarPointId: string,
  today: string,
) {
  const { error } = await supabase.from('user_grammar_status').upsert(
    { user_id: userId, grammar_point_id: grammarPointId, srs_due_date: today },
    { onConflict: 'user_id,grammar_point_id' },
  );
  if (error) throw new ApiError(500, error.message);
}
