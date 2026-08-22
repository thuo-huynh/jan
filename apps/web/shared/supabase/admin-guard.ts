import { NextResponse } from 'next/server';
import type { User } from '@supabase/supabase-js';
import { createClient } from './server';
import { createAdminClient } from './admin';

/**
 * Shared auth guard for every `app/api/admin/**` Route Handler.
 *
 * `app/admin/layout.tsx` performs the equivalent server-side role check for
 * *pages*, but Next.js layouts do not wrap Route Handlers (contracts/api.md
 * "Admin routes" note, plan.md) — each admin API route MUST independently
 * verify the caller is an authenticated admin before touching anything.
 *
 * Order matters and must never be swapped (data-model.md RLS Summary /
 * research.md §1/§2):
 *   1. Confirm a logged-in session exists via the regular server client.
 *   2. Read that user's OWN `profiles.role` via the regular (RLS-respecting)
 *      server client — a user can always SELECT their own profile row
 *      (`profiles_select_own` in 0011_rls_owner_scoped.sql), so this is safe
 *      without needing the service-role client yet.
 *   3. Only if `role === 'admin'`, hand back the service-role client
 *      (`admin.ts`) for the actual privileged operation.
 *
 * A client-supplied "I am admin" flag is never trusted — role is always
 * re-derived server-side from the database on every request.
 */
export type AdminGuardResult =
  | { ok: true; user: User; admin: ReturnType<typeof createAdminClient> }
  | { ok: false; response: NextResponse };

export async function requireAdmin(): Promise<AdminGuardResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 }),
    };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 403 }),
    };
  }

  return { ok: true, user, admin: createAdminClient() };
}
