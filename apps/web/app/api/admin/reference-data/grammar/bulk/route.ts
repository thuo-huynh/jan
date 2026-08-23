import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/shared/supabase/admin-guard';

/**
 * POST /api/admin/reference-data/grammar/bulk — bulk-insert global
 * (`user_id IS NULL`) grammar_points rows in one request, the grammar
 * counterpart to ../../vocab/bulk/route.ts — sink for the same
 * CSV/Markdown/HTML tabular import panel
 * (features/admin/components/TabularImportPanel.tsx).
 */
const bulkEntrySchema = z.object({
  pattern: z.string().trim().min(1).max(200),
  meaning: z.string().trim().min(1).max(1000),
  connectionForm: z.string().trim().max(500).nullable().optional(),
  formalityNuance: z.string().trim().max(1000).nullable().optional(),
  exampleSentences: z.array(z.string().trim().min(1).max(500)).max(20).optional(),
  jlptLevel: z.string().trim().max(10).nullable().optional(),
  frequencyTag: z.string().trim().max(20).nullable().optional(),
  n3Overlap: z.boolean().optional(),
});

const bulkRequestSchema = z.object({
  entries: z.array(bulkEntrySchema).min(1).max(2000),
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

  const { data, error } = await admin
    .from('grammar_points')
    .insert(
      parsed.data.entries.map((e) => ({
        user_id: null,
        pattern: e.pattern,
        meaning: e.meaning,
        connection_form: e.connectionForm ?? null,
        formality_nuance: e.formalityNuance ?? null,
        example_sentences: e.exampleSentences ?? [],
        jlpt_level: e.jlptLevel?.trim() || 'N2',
        frequency_tag: e.frequencyTag ?? null,
        n3_overlap: e.n3Overlap ?? false,
      })),
    )
    .select();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ inserted: data?.length ?? 0, items: data ?? [] }, { status: 201 });
}
