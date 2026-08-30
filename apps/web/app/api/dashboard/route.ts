import { NextResponse } from 'next/server';
import { createClient } from '@/shared/supabase/server';
import { loadDashboardData } from '@/features/dashboard/lib/aggregate';

/**
 * GET /api/dashboard — T075. Aggregates the consolidated progress dashboard
 * in one call. Thin wrapper around loadDashboardData — the dashboard
 * page (app/(app)/learn/dashboard/page.tsx) calls the same function directly
 * to avoid a same-origin HTTP round trip; this route exists for any other
 * consumer per the documented contract.
 */
export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
  }

  const data = await loadDashboardData(supabase, user.id);
  return NextResponse.json(data);
}
