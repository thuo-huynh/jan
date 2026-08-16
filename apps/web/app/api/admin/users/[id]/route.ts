import { NextResponse, type NextRequest } from 'next/server';
import { requireAdmin } from '@/shared/supabase/admin-guard';

/**
 * T087 — DELETE /api/admin/users/:id
 * Requires `{ "confirm": true }` in the body (contracts/api.md). Guards
 * against self-delete and deleting the last remaining admin (Edge Cases,
 * FR-045). The confirm-dialog itself is a UI-level concern (T093); this
 * route stays safe to call idempotently — calling it twice on the same id
 * just yields 404 the second time since the user no longer exists.
 *
 * Deletes via `auth.admin.deleteUser`, which removes the `auth.users` row;
 * `profiles.id` FKs to `auth.users.id` with `on delete cascade`
 * (0001_profiles.sql), and every user-owned table FKs to `profiles.id` with
 * `on delete cascade` (boards, vocab_entries, grammar_points, notes,
 * mistake_notebook, reading_logs, listening_logs, review_logs,
 * user_vocab_progress, user_grammar_status, study_goals, mock_test_results)
 * — so this single call cascades through the user's entire content graph at
 * the database level, matching "the user's account and associated content
 * are removed" (FR-045/Acceptance Scenario 4).
 */
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;
  const { admin, user } = guard;
  const targetId = params.id;

  const body = await request.json().catch(() => ({}));
  if (body?.confirm !== true) {
    return NextResponse.json(
      { error: 'Deletion requires { "confirm": true } in the request body' },
      { status: 400 },
    );
  }

  if (targetId === user.id) {
    return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 409 });
  }

  const { data: target, error: fetchError } = await admin
    .from('profiles')
    .select('id, role')
    .eq('id', targetId)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }
  if (!target) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  if (target.role === 'admin') {
    const { count, error: countError } = await admin
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'admin');

    if (countError) {
      return NextResponse.json({ error: countError.message }, { status: 500 });
    }
    if ((count ?? 0) <= 1) {
      return NextResponse.json(
        { error: 'Cannot delete the last remaining admin account' },
        { status: 409 },
      );
    }
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(targetId);
  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ id: targetId, deleted: true });
}
