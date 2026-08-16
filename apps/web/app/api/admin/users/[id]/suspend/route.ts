import { NextResponse, type NextRequest } from 'next/server';
import { requireAdmin } from '@/shared/supabase/admin-guard';

/**
 * T086 — POST /api/admin/users/:id/suspend
 * Sets `profiles.status = 'suspended'` (FR-045/FR-049) and best-effort
 * invalidates the user's active session.
 *
 * Deviation from the literal contracts/api.md wording ("sets status =
 * suspended"): this route also accepts an optional
 * `{ "status": "active" | "suspended" }` body (default `"suspended"`) so the
 * same route covers the "reinstate" transition data-model.md's State
 * Transitions section explicitly allows (`suspended -> active`) — there is
 * no separate reinstate task in tasks.md, and adding a second route for the
 * inverse of a single-column toggle would be redundant. The admin users page
 * (T093) uses this to render a Suspend/Reinstate toggle per row.
 *
 * SESSION INVALIDATION — known gap, documented per the task brief:
 * @supabase/supabase-js's admin API only exposes `auth.admin.signOut(jwt,
 * scope)`, which invalidates a session by its *access token/JWT*, not by
 * user id (verified against the installed
 * node_modules/@supabase/auth-js/dist/module/GoTrueAdminApi.d.ts — no
 * "signOut by user id" method exists). There is no direct "kill every
 * session for this user id" call in this client version.
 *
 * The closest available primitive is `auth.admin.updateUserById(id, {
 * ban_duration })`, which prevents the user from signing in or refreshing
 * their access token going forward — used here as best-effort session
 * invalidation. It does NOT immediately revoke an already-issued,
 * still-unexpired access token (Supabase access tokens are short-lived JWTs,
 * default ~1h, validated locally without a DB round-trip) — an
 * already-active session can keep working until that token naturally
 * expires or the app tries to refresh it, at which point the ban blocks it.
 *
 * Additionally: nothing else in this codebase reads `profiles.status`
 * anywhere (checked `middleware.ts` and `app/(app)/layout.tsx` — neither
 * queries it). FR-049 ("a suspended user MUST be prevented from ... using
 * any user-facing feature") is therefore NOT enforced app-side today beyond
 * the auth-level ban attempted here — this is a real gap, flagged rather
 * than silently left unaddressed, and out of scope to fix under T086 (it
 * would mean editing `app/(app)/layout.tsx` and/or `middleware.ts`, which
 * are outside this task's assigned files).
 */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;
  const { admin } = guard;
  const targetId = params.id;

  const body = await request.json().catch(() => ({}));
  const status: 'active' | 'suspended' = body?.status === 'active' ? 'active' : 'suspended';

  const { data: updated, error: updateError } = await admin
    .from('profiles')
    .update({ status })
    .eq('id', targetId)
    .select('id, email, status')
    .maybeSingle();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }
  if (!updated) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Best-effort auth-level session invalidation — see doc comment above.
  let sessionInvalidation: 'banned' | 'unbanned' | 'failed' = 'failed';
  try {
    const { error: banError } = await admin.auth.admin.updateUserById(targetId, {
      ban_duration: status === 'suspended' ? '876000h' : 'none',
    });
    if (!banError) {
      sessionInvalidation = status === 'suspended' ? 'banned' : 'unbanned';
    }
  } catch {
    // Swallow — the profiles.status update above is the authoritative record
    // of suspension; the auth-level ban is a best-effort addition on top.
  }

  return NextResponse.json({
    id: updated.id,
    email: updated.email,
    status: updated.status,
    sessionInvalidation,
  });
}
