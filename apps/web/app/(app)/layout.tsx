import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient, getAuthedUser } from '@/shared/supabase/server';
import { AppNav, type NavLinkItem } from '@/shared/components/AppNav';

/**
 * Authenticated app shell: top nav (Boards / Learn / Habits / Settings /
 * Notes [/ Admin]) + sign-out. `middleware.ts` already redirects
 * unauthenticated requests away from this route group, but this layout also
 * re-checks server-side (defense in depth — never trust that middleware
 * alone gates access, per research.md §1) and reads the profile for
 * display. The nav itself collapses to a hamburger menu below `sm` (AppNav)
 * so the header doesn't overflow on a phone.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const user = await getAuthedUser();

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

  const navLinks: NavLinkItem[] = [
    { href: '/boards', label: 'Boards' },
    { href: '/learn/dashboard', label: 'Learn' },
    { href: '/habits', label: 'Habits' },
    { href: '/settings', label: 'Settings' },
    { href: '/notes', label: 'Notes' },
    ...(profile?.role === 'admin' ? [{ href: '/admin/users', label: 'Admin' }] : []),
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="relative border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-3 sm:gap-6">
            <Link href="/boards" className="text-base font-semibold text-foreground">
              JanGo
            </Link>
            <AppNav links={navLinks} />
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
