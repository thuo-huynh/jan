import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/shared/supabase/admin-guard';
import { grammarPointSchema } from '@/shared/validation/schemas';

/**
 * T091 — GET/POST/PUT/DELETE /api/admin/reference-data/grammar
 * CRUD on the global (`user_id IS NULL`) rows of `grammar_points` — the
 * ~200-point N2 reference database (FR-012, FR-048). Only reachable via the
 * service-role client, same reasoning as the vocab route (0012_rls_reference_data.sql).
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
    .from('grammar_points')
    .select('*', { count: 'exact' })
    .is('user_id', null)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (query) {
    q = q.or(`pattern.ilike.%${query}%,meaning.ilike.%${query}%`);
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
  const parsed = grammarPointSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { data, error } = await admin
    .from('grammar_points')
    .insert({
      user_id: null,
      pattern: parsed.data.pattern,
      meaning: parsed.data.meaning,
      connection_form: parsed.data.connectionForm ?? null,
      formality_nuance: parsed.data.formalityNuance ?? null,
      example_sentences: parsed.data.exampleSentences ?? [],
      jlpt_level: parsed.data.jlptLevel ?? 'N2',
      frequency_tag: parsed.data.frequencyTag ?? null,
      n3_overlap: parsed.data.n3Overlap ?? false,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

const updateSchema = grammarPointSchema.partial().extend({ id: z.string().uuid() });

export async function PUT(request: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;
  const { admin } = guard;

  const json = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const {
    id,
    pattern,
    meaning,
    connectionForm,
    formalityNuance,
    exampleSentences,
    jlptLevel,
    frequencyTag,
    n3Overlap,
  } = parsed.data;

  const updatePayload: Record<string, unknown> = {};
  if (pattern !== undefined) updatePayload.pattern = pattern;
  if (meaning !== undefined) updatePayload.meaning = meaning;
  if (connectionForm !== undefined) updatePayload.connection_form = connectionForm;
  if (formalityNuance !== undefined) updatePayload.formality_nuance = formalityNuance;
  if (exampleSentences !== undefined) updatePayload.example_sentences = exampleSentences;
  if (jlptLevel !== undefined) updatePayload.jlpt_level = jlptLevel;
  if (frequencyTag !== undefined) updatePayload.frequency_tag = frequencyTag;
  if (n3Overlap !== undefined) updatePayload.n3_overlap = n3Overlap;

  const { data, error } = await admin
    .from('grammar_points')
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
    .from('grammar_points')
    .delete()
    .eq('id', id)
    .is('user_id', null)
    .select('id')
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ id, deleted: true });
}
