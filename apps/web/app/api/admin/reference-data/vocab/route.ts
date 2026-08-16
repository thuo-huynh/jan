import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/shared/supabase/admin-guard';
import { vocabEntrySchema } from '@/shared/validation/schemas';

/**
 * T090 — GET/POST/PUT/DELETE /api/admin/reference-data/vocab
 * CRUD on the global (`user_id IS NULL`) rows of `vocab_entries` — the
 * shared N2 vocab/kanji catalog (FR-017, FR-048). Only reachable via the
 * service-role client: 0012_rls_reference_data.sql has no
 * authenticated-role insert/update/delete policy that can ever match a
 * `user_id IS NULL` row (`vocab_entries_insert_own` etc. all require
 * `auth.uid() = user_id`, which a null column can never satisfy).
 *
 * Reuses `vocabEntrySchema` from shared/validation/schemas.ts (T052's custom
 * vocab entry form schema) since the global reference-entry field set is
 * identical — only `user_id` differs (forced to `null` here vs. the caller's
 * id there).
 */
const PAGE_SIZE = 50;

export async function GET(request: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;
  const { admin } = guard;

  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query')?.trim() ?? '';
  const page = Math.max(1, Number(searchParams.get('page') ?? '1') || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let q = admin
    .from('vocab_entries')
    .select('*', { count: 'exact' })
    .is('user_id', null)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (query) {
    q = q.or(`word.ilike.%${query}%,meaning.ilike.%${query}%,reading.ilike.%${query}%`);
  }

  const { data, error, count } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ items: data ?? [], total: count ?? 0, page, pageSize: PAGE_SIZE });
}

export async function POST(request: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;
  const { admin } = guard;

  const json = await request.json().catch(() => null);
  const parsed = vocabEntrySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { data, error } = await admin
    .from('vocab_entries')
    .insert({
      user_id: null,
      word: parsed.data.word,
      reading: parsed.data.reading ?? null,
      meaning: parsed.data.meaning,
      example: parsed.data.example ?? null,
      jlpt_level: parsed.data.jlptLevel ?? 'N2',
      is_kanji: parsed.data.isKanji ?? false,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

const updateSchema = vocabEntrySchema.partial().extend({ id: z.string().uuid() });

export async function PUT(request: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;
  const { admin } = guard;

  const json = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { id, word, reading, meaning, example, jlptLevel, isKanji } = parsed.data;

  const updatePayload: Record<string, unknown> = {};
  if (word !== undefined) updatePayload.word = word;
  if (reading !== undefined) updatePayload.reading = reading;
  if (meaning !== undefined) updatePayload.meaning = meaning;
  if (example !== undefined) updatePayload.example = example;
  if (jlptLevel !== undefined) updatePayload.jlpt_level = jlptLevel;
  if (isKanji !== undefined) updatePayload.is_kanji = isKanji;

  const { data, error } = await admin
    .from('vocab_entries')
    .update(updatePayload)
    .eq('id', id)
    .is('user_id', null)
    .select()
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(data);
}

export async function DELETE(request: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;
  const { admin } = guard;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id query param required' }, { status: 400 });

  const { data, error } = await admin
    .from('vocab_entries')
    .delete()
    .eq('id', id)
    .is('user_id', null)
    .select('id')
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ id, deleted: true });
}
