import { NextResponse } from 'next/server';
import { requireAdmin } from '@/shared/supabase/admin-guard';

/**
 * T089 — GET /api/admin/stats
 * Aggregate usage statistics for the admin dashboard (FR-047):
 * total users, 7d/30d active users (via `profiles.last_active_at`, per the
 * spec's Assumptions: "active user" = at least one authenticated
 * session/content action in that window — `last_active_at` is this app's
 * proxy for that), and total tasks/notes/vocab created. `totalVocab` counts
 * all `vocab_entries` rows (both the global reference catalog and every
 * user's custom entries), matching the plain "total vocab created" wording
 * in contracts/api.md rather than only custom rows.
 */
export async function GET() {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;
  const { admin } = guard;

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [totalUsers, activeUsers7d, activeUsers30d, totalTasks, totalNotes, totalVocab] =
    await Promise.all([
      admin.from('profiles').select('id', { count: 'exact', head: true }),
      admin
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .gte('last_active_at', sevenDaysAgo),
      admin
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .gte('last_active_at', thirtyDaysAgo),
      admin.from('tasks').select('id', { count: 'exact', head: true }),
      admin.from('notes').select('id', { count: 'exact', head: true }),
      admin.from('vocab_entries').select('id', { count: 'exact', head: true }),
    ]);

  const firstError = [
    totalUsers,
    activeUsers7d,
    activeUsers30d,
    totalTasks,
    totalNotes,
    totalVocab,
  ].find((result) => result.error)?.error;

  if (firstError) {
    return NextResponse.json({ error: firstError.message }, { status: 500 });
  }

  return NextResponse.json({
    totalUsers: totalUsers.count ?? 0,
    activeUsers7d: activeUsers7d.count ?? 0,
    activeUsers30d: activeUsers30d.count ?? 0,
    totalTasks: totalTasks.count ?? 0,
    totalNotes: totalNotes.count ?? 0,
    totalVocab: totalVocab.count ?? 0,
  });
}
