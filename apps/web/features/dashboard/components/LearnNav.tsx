'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LEARN_TABS = [
  { href: '/learn/dashboard', label: 'Dashboard' },
  { href: '/learn/vocab', label: 'Vocab' },
  { href: '/learn/grammar', label: 'Grammar' },
  { href: '/learn/reading', label: 'Reading' },
  { href: '/learn/listening', label: 'Listening' },
  { href: '/learn/review', label: 'Review' },
  { href: '/learn/study-plan', label: 'Study Plan' },
  { href: '/learn/mistakes', label: 'Mistakes' },
  { href: '/learn/mock-tests', label: 'Mock Tests' },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Secondary tab strip for the eight /learn/* pages. Previously the only way
 * between them was the top nav's single "Learn" link (always -> dashboard)
 * plus whatever incidental cross-links a given page happened to have, so
 * e.g. Review or Mock Tests were only reachable via a typed URL. Horizontal
 * scroll (not wrap, not a hamburger like AppNav) on mobile since nine tabs
 * would eat too much vertical space wrapped, and this is secondary nav
 * rather than the primary app shell AppNav already handles.
 */
export function LearnNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Learn sections" className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <div className="flex w-max min-w-full gap-1.5 border-b border-border pb-2 sm:w-full">
        {LEARN_TABS.map((tab) => {
          const active = isActive(pathname, tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? 'page' : undefined}
              className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                active
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
