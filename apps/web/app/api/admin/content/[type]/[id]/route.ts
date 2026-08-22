import { NextResponse, type NextRequest } from 'next/server';
import { requireAdmin } from '@/shared/supabase/admin-guard';
import { CONTENT_TYPES, isContentType, type ContentType } from '../../_shared';

/**
 * T088 — DELETE /api/admin/content/:type/:id
 * Removes a specific content item for moderation (FR-046). `grammar_notes`
 * is the special case documented in `../../_shared.ts`: it clears
 * `user_grammar_status.notes_user` rather than deleting the row, since the
 * row also carries `status`/SRS state unrelated to the moderated note.
 */
const TABLE_BY_TYPE: Record<Exclude<ContentType, 'grammar_notes' | 'vocab'>, string> = {
  tasks: 'tasks',
  notes: 'notes',
  reading_logs: 'reading_logs',
  listening_logs: 'listening_logs',
  mistakes: 'mistake_notebook',
};

export async function DELETE(
  request: NextRequest,
  { params }: { params: { type: string; id: string } },
) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;
  const { admin } = guard;
  const { type, id } = params;

  if (!isContentType(type)) {
    return NextResponse.json(
      { error: `type must be one of: ${CONTENT_TYPES.join(', ')}` },
      { status: 400 },
    );
  }

  if (type === 'grammar_notes') {
    const { data, error } = await admin
      .from('user_grammar_status')
      .update({ notes_user: null })
      .eq('id', id)
      .select('id')
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 });
    return NextResponse.json({ id, type, cleared: true });
  }

  if (type === 'vocab') {
    // Only custom (user-authored) rows are content-moderation targets here;
    // global reference rows are managed via /api/admin/reference-data/vocab.
    const { data, error } = await admin
      .from('vocab_entries')
      .delete()
      .eq('id', id)
      .not('user_id', 'is', null)
      .select('id')
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 });
    return NextResponse.json({ id, type, deleted: true });
  }

  const table = TABLE_BY_TYPE[type];
  const { data, error } = await admin.from(table).delete().eq('id', id).select('id').maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 });
  return NextResponse.json({ id, type, deleted: true });
}
