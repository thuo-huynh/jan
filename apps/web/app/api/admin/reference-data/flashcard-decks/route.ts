import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/shared/supabase/admin';
import { requireAdmin } from '@/shared/supabase/admin-guard';
import { sharedFlashcardDeckSchema } from '@/shared/validation/schemas';

const updateSharedFlashcardDeckSchema = z
  .object({ id: z.string().uuid() })
  .and(sharedFlashcardDeckSchema);

async function hasOnlyGlobalVocabulary(
  admin: ReturnType<typeof createAdminClient>,
  vocabIds: string[]
) {
  if (vocabIds.length === 0) return true;

  const { count, error } = await admin
    .from('vocab_entries')
    .select('id', { count: 'exact', head: true })
    .in('id', vocabIds)
    .is('user_id', null);

  return !error && count === vocabIds.length;
}

async function replaceMembership(
  admin: ReturnType<typeof createAdminClient>,
  deckId: string,
  vocabIds: string[]
) {
  const { error: deleteError } = await admin
    .from('shared_flashcard_deck_entries')
    .delete()
    .eq('deck_id', deckId);
  if (deleteError) return deleteError;
  if (vocabIds.length === 0) return null;

  const { error: insertError } = await admin
    .from('shared_flashcard_deck_entries')
    .insert(
      vocabIds.map((vocabId, position) => ({ deck_id: deckId, vocab_id: vocabId, position }))
    );
  return insertError;
}

/** Admin-only CRUD for global Flashcard deck metadata and ordered membership. */
export async function GET() {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const { data, error } = await guard.admin
    .from('shared_flashcard_decks')
    .select(
      'id, title, description, jlpt_level, labels, is_published, created_at, shared_flashcard_deck_entries(vocab_id, position, vocab_entries(id, word, reading, meaning))'
    )
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data ?? [] });
}

export async function POST(request: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const json = await request.json().catch(() => null);
  const parsed = sharedFlashcardDeckSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  if (!(await hasOnlyGlobalVocabulary(guard.admin, parsed.data.vocabIds))) {
    return NextResponse.json(
      { error: 'Chỉ có thể thêm từ vựng dùng chung vào bộ Flashcards.' },
      { status: 400 }
    );
  }

  const { data: deck, error: deckError } = await guard.admin
    .from('shared_flashcard_decks')
    .insert({
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      jlpt_level: parsed.data.jlptLevel ?? null,
      labels: parsed.data.labels,
      is_published: parsed.data.isPublished,
    })
    .select('id, title, description, jlpt_level, labels, is_published, created_at')
    .single();

  if (deckError || !deck)
    return NextResponse.json({ error: deckError?.message ?? 'Không thể tạo bộ.' }, { status: 500 });

  const membershipError = await replaceMembership(guard.admin, deck.id, parsed.data.vocabIds);
  if (membershipError) {
    await guard.admin.from('shared_flashcard_decks').delete().eq('id', deck.id);
    return NextResponse.json({ error: membershipError.message }, { status: 500 });
  }

  return NextResponse.json(deck, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const json = await request.json().catch(() => null);
  const parsed = updateSharedFlashcardDeckSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  if (!(await hasOnlyGlobalVocabulary(guard.admin, parsed.data.vocabIds))) {
    return NextResponse.json(
      { error: 'Chỉ có thể thêm từ vựng dùng chung vào bộ Flashcards.' },
      { status: 400 }
    );
  }

  const { data: deck, error: deckError } = await guard.admin
    .from('shared_flashcard_decks')
    .update({
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      jlpt_level: parsed.data.jlptLevel ?? null,
      labels: parsed.data.labels,
      is_published: parsed.data.isPublished,
      updated_at: new Date().toISOString(),
    })
    .eq('id', parsed.data.id)
    .select('id, title, description, jlpt_level, labels, is_published, created_at')
    .maybeSingle();

  if (deckError) return NextResponse.json({ error: deckError.message }, { status: 500 });
  if (!deck) return NextResponse.json({ error: 'Không tìm thấy bộ Flashcards.' }, { status: 404 });

  const membershipError = await replaceMembership(guard.admin, deck.id, parsed.data.vocabIds);
  if (membershipError)
    return NextResponse.json({ error: membershipError.message }, { status: 500 });
  return NextResponse.json(deck);
}

export async function DELETE(request: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const id = new URL(request.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Cần tham số id.' }, { status: 400 });

  const { data, error } = await guard.admin
    .from('shared_flashcard_decks')
    .delete()
    .eq('id', id)
    .select('id')
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Không tìm thấy bộ Flashcards.' }, { status: 404 });
  return NextResponse.json({ id, deleted: true });
}
