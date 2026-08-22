import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { createClient, getAuthedUser } from '@/shared/supabase/server';
import { AppNav, type NavLinkItem } from '@/shared/components/AppNav';

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
  const user = await getAuthedUser();

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

  const navLinks: NavLinkItem[] = [
    { href: '/admin/users', label: 'Người dùng' },
    { href: '/admin/content', label: 'Nội dung' },
    { href: '/admin/stats', label: 'Thống kê' },
    { href: '/admin/reference-data', label: 'Dữ liệu tham chiếu' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="relative mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
          <div className="flex items-center gap-3 sm:gap-6">
            <Link
              href="/admin/users"
              className="flex items-center gap-2 text-base font-bold tracking-tight text-foreground"
            >
              <ShieldCheck className="h-6 w-6 text-primary" aria-hidden="true" />
              JanGo Quản trị
            </Link>
            <AppNav links={navLinks} />
          </div>
          <Link href="/boards" aria-label="Về ứng dụng" className="btn-ghost shrink-0">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Về ứng dụng</span>
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 sm:py-8">{children}</main>
    </div>
  );
}
