import Link from 'next/link';
import { redirect } from 'next/navigation';
import { GraduationCap, LogOut } from 'lucide-react';
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
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="relative mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
          <div className="flex items-center gap-3 sm:gap-6">
            <Link href="/boards" className="flex items-center gap-2 text-base font-bold tracking-tight text-foreground">
              <GraduationCap className="h-6 w-6 text-primary" aria-hidden="true" />
              JanGo
            </Link>
            <AppNav links={navLinks} />
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-muted-foreground sm:inline">
              {profile?.email ?? user.email}
            </span>
            <form action={signOut}>
              <button type="submit" aria-label="Sign out" className="btn-outline">
                <LogOut className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 sm:py-8">{children}</main>
    </div>
  );
}
