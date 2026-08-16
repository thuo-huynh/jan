import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/shared/supabase/server';

/**
 * Authenticated app shell: top nav (Boards / Learn / Notes) + sign-out.
 * `middleware.ts` already redirects unauthenticated requests away from this
 * route group, but this layout also re-checks server-side (defense in
 * depth — never trust that middleware alone gates access, per research.md §1)
 * and reads the profile for display.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('email, role')
    .eq('id', user.id)
    .single();

  async function signOut() {
    'use server';
    const supabase = createClient();
    await supabase.auth.signOut();
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-6">
            <Link href="/boards" className="text-base font-semibold text-foreground">
              TaskNihongo
            </Link>
            <nav className="flex items-center gap-4 text-sm font-medium text-muted-foreground">
              <Link href="/boards" className="transition-colors hover:text-foreground">
                Boards
              </Link>
              <Link href="/learn/dashboard" className="transition-colors hover:text-foreground">
                Learn
              </Link>
              <Link href="/habits" className="transition-colors hover:text-foreground">
                Habits
              </Link>
              <Link href="/settings" className="transition-colors hover:text-foreground">
                Settings
              </Link>
              <Link href="/notes" className="transition-colors hover:text-foreground">
                Notes
              </Link>
              {profile?.role === 'admin' && (
                <Link href="/admin/users" className="transition-colors hover:text-foreground">
                  Admin
                </Link>
              )}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-muted-foreground sm:inline">
              {profile?.email ?? user.email}
            </span>
            <form action={signOut}>
              <button
                type="submit"
                className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
