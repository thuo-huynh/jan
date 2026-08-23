import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/shared/supabase/admin-guard';

/**
 * POST /api/admin/reference-data/vocab/bulk — bulk-insert global
 * (`user_id IS NULL`) vocab_entries rows in one request, the admin
 * counterpart to the personal "paste many words" flow
 * (features/vocab-srs/components/BulkVocabAddForm.tsx +
 * lib/bulkParse.ts). The N2 catalog otherwise has no way to grow past one
 * row at a time via the single-entry POST in ../route.ts.
 *
 * The client parses/previews with parseBulkVocabInput before calling this —
 * this route re-validates every entry itself (never trust client input),
 * same defense-in-depth posture as the single POST.
 */
const bulkEntrySchema = z.object({
  word: z.string().trim().min(1).max(200),
  reading: z.string().trim().max(200).nullable(),
  meaning: z.string().trim().min(1).max(1000),
});

const bulkRequestSchema = z.object({
  entries: z.array(bulkEntrySchema).min(1).max(2000),
  jlptLevel: z.string().trim().max(10).optional(),
  isKanji: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;
  const { admin } = guard;

  const json = await request.json().catch(() => null);
  const parsed = bulkRequestSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const jlptLevel = parsed.data.jlptLevel?.trim() || 'N2';
  const isKanji = parsed.data.isKanji ?? false;

  const { data, error } = await admin
    .from('vocab_entries')
    .insert(
      parsed.data.entries.map((e) => ({
        user_id: null,
        word: e.word,
        reading: e.reading,
        meaning: e.meaning,
        example: null,
        jlpt_level: jlptLevel,
        is_kanji: isKanji,
      })),
    )
    .select();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ inserted: data?.length ?? 0, items: data ?? [] }, { status: 201 });
}
