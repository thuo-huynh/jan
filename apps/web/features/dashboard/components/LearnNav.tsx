'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen, BookText, Headphones, LayoutDashboard, Languages, RotateCw } from 'lucide-react';

const LEARN_TABS = [
  { href: '/learn/dashboard', label: 'Tổng quan', icon: LayoutDashboard },
  { href: '/learn/vocab', label: 'Từ vựng', icon: BookOpen },
  { href: '/learn/grammar', label: 'Ngữ pháp', icon: Languages },
  { href: '/learn/reading', label: 'Đọc hiểu', icon: BookText },
  { href: '/learn/listening', label: 'Nghe hiểu', icon: Headphones },
  { href: '/learn/review', label: 'Ôn tập', icon: RotateCw },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Secondary tab strip for the core /learn/* pages. Previously the only way
 * between them was the top nav's single "Learn" link (always -> dashboard)
 * plus whatever incidental cross-links a given page happened to have, so
 * e.g. Review was only reachable via a typed URL. Horizontal
 * scroll (not wrap, not a hamburger like AppNav) on mobile since six tabs
 * would eat too much vertical space wrapped, and this is secondary nav
 * rather than the primary app shell AppNav already handles.
 */
export function LearnNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Các mục học tập" className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <div className="flex w-max min-w-full gap-1.5 border-b border-border pb-2 sm:w-full">
        {LEARN_TABS.map((tab) => {
          const active = isActive(pathname, tab.href);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? 'page' : undefined}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors duration-200 ${
                active
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
