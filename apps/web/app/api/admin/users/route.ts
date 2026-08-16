import { NextResponse, type NextRequest } from 'next/server';
import { requireAdmin } from '@/shared/supabase/admin-guard';

/**
 * T085 — GET /api/admin/users?query=&page=
 * Lists/searches user profiles for the admin user-management page (FR-044).
 * contracts/api.md documents the response as "array of
 * { id, email, signupDate, lastActiveAt, status }"; this wraps that array in
 * an object with pagination metadata (`total`/`page`/`pageSize`), matching
 * the object-wrapper convention used by the other documented endpoints in
 * contracts/api.md (e.g. `GET /api/review-queue` -> `{ items: [...] }`)
 * rather than a bare array, so the admin users page (T093) can paginate.
 * `role` is included too (not in the documented shape) since the delete
 * route's "last remaining admin" guard (T087) and the UI both need it.
 */
const PAGE_SIZE = 25;

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
    .from('profiles')
    .select('id, email, role, status, created_at, last_active_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (query) {
    q = q.ilike('email', `%${query}%`);
  }

  const { data, error, count } = await q;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const users = (data ?? []).map((row) => ({
    id: row.id,
    email: row.email,
    role: row.role,
    status: row.status,
    signupDate: row.created_at,
    lastActiveAt: row.last_active_at,
  }));

  return NextResponse.json({ users, total: count ?? 0, page, pageSize: PAGE_SIZE });
}
