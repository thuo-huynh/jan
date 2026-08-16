import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/shared/supabase/server';

/**
 * Role-gated admin route group. Per FR-003/research.md §1: the admin check
 * MUST be server-side and read the verified session/DB role — never a
 * client-readable flag. `middleware.ts` only checks "is there a session,"
 * this layout checks "is that session an admin," using the RLS-protected
 * `profiles` table (a non-admin session simply cannot see role = 'admin' for
 * someone else, but CAN read its own row via the `profiles_select_own`
 * policy in 0011_rls_owner_scoped.sql, which is all this check needs).
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    redirect('/boards');
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-6">
            <Link href="/admin/users" className="text-base font-semibold text-foreground">
              TaskNihongo Admin
            </Link>
            <nav className="flex items-center gap-4 text-sm font-medium text-muted-foreground">
              <Link href="/admin/users" className="transition-colors hover:text-foreground">
                Users
              </Link>
              <Link href="/admin/content" className="transition-colors hover:text-foreground">
                Content
              </Link>
              <Link href="/admin/stats" className="transition-colors hover:text-foreground">
                Stats
              </Link>
              <Link
                href="/admin/reference-data"
                className="transition-colors hover:text-foreground"
              >
                Reference Data
              </Link>
            </nav>
          </div>
          <Link href="/boards" className="text-sm font-medium text-primary hover:underline">
            Back to app
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
