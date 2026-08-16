import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/shared/supabase/admin-guard';
import { confusablePairSchema } from '@/shared/validation/schemas';

/**
 * T092 — GET/POST/PUT/DELETE /api/admin/reference-data/confusable-pairs
 * CRUD on `grammar_confusable_pairs` — always global reference data (no
 * `user_id` column at all), only service-role writable (FR-015, FR-048;
 * 0012_rls_reference_data.sql grants authenticated users SELECT only).
 *
 * GET resolves each pair's two `grammar_points` (pattern/meaning) with a
 * separate follow-up query rather than a single PostgREST nested embed:
 * `grammar_confusable_pairs` has TWO foreign keys into `grammar_points`
 * (`grammar_point_id_a` and `grammar_point_id_b`), which is the ambiguous
 * embed case PostgREST requires an explicit `!<fk-or-column>` hint to
 * resolve — since the exact auto-generated constraint names aren't
 * guaranteed here without inspecting the live database, a plain two-query
 * join in application code is used instead: safer than guessing constraint
 * names.
 */
const PAGE_SIZE = 50;

interface ConfusablePairRow {
  id: string;
  grammar_point_id_a: string;
  grammar_point_id_b: string;
  comparison_note: string;
  created_at: string;
}

interface GrammarPointLookupRow {
  id: string;
  pattern: string;
  meaning: string;
}

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
    .from('grammar_confusable_pairs')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (query) {
    q = q.ilike('comparison_note', `%${query}%`);
  }

  const { data: pairs, error, count } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const pairRows = (pairs ?? []) as unknown as ConfusablePairRow[];
  const pointIds = Array.from(
    new Set(pairRows.flatMap((p) => [p.grammar_point_id_a, p.grammar_point_id_b])),
  );

  let pointsById: Record<string, { pattern: string; meaning: string }> = {};
  if (pointIds.length > 0) {
    const { data: points, error: pointsError } = await admin
      .from('grammar_points')
      .select('id, pattern, meaning')
      .in('id', pointIds);
    if (pointsError) return NextResponse.json({ error: pointsError.message }, { status: 500 });
    pointsById = Object.fromEntries(
      ((points ?? []) as unknown as GrammarPointLookupRow[]).map((pt) => [
        pt.id,
        { pattern: pt.pattern, meaning: pt.meaning },
      ]),
    );
  }

  const items = pairRows.map((p) => ({
    id: p.id,
    grammarPointIdA: p.grammar_point_id_a,
    grammarPointIdB: p.grammar_point_id_b,
    pointA: pointsById[p.grammar_point_id_a] ?? null,
    pointB: pointsById[p.grammar_point_id_b] ?? null,
    comparisonNote: p.comparison_note,
    createdAt: p.created_at,
  }));

  return NextResponse.json({ items, total: count ?? 0, page, pageSize: PAGE_SIZE });
}

export async function POST(request: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;
  const { admin } = guard;

  const json = await request.json().catch(() => null);
  const parsed = confusablePairSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { data, error } = await admin
    .from('grammar_confusable_pairs')
    .insert({
      grammar_point_id_a: parsed.data.grammarPointIdA,
      grammar_point_id_b: parsed.data.grammarPointIdB,
      comparison_note: parsed.data.comparisonNote,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

const updateSchema = confusablePairSchema.partial().extend({ id: z.string().uuid() });

export async function PUT(request: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;
  const { admin } = guard;

  const json = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { id, grammarPointIdA, grammarPointIdB, comparisonNote } = parsed.data;

  const updatePayload: Record<string, unknown> = {};
  if (grammarPointIdA !== undefined) updatePayload.grammar_point_id_a = grammarPointIdA;
  if (grammarPointIdB !== undefined) updatePayload.grammar_point_id_b = grammarPointIdB;
  if (comparisonNote !== undefined) updatePayload.comparison_note = comparisonNote;

  const { data, error } = await admin
    .from('grammar_confusable_pairs')
    .update(updatePayload)
    .eq('id', id)
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
    .from('grammar_confusable_pairs')
    .delete()
    .eq('id', id)
    .select('id')
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ id, deleted: true });
}
