'use client';

import { useState } from 'react';
import Link from 'next/link';

/**
 * Responsive nav for the app shell headers (app/(app)/layout.tsx and
 * app/admin/layout.tsx). Both previously packed the logo, several nav
 * links, and trailing actions into a single non-wrapping flex row — fine at
 * desktop widths but overflowed and misaligned on a phone (no responsive
 * pass ever happened here, consistent with 001-tasknihongo's tasks.md T097
 * being left unchecked). Desktop keeps the inline link row; below the `sm`
 * breakpoint it collapses behind a hamburger toggle that opens a stacked
 * panel instead. The parent `<header>` must be `position: relative` for the
 * mobile panel to anchor correctly.
 */
export interface NavLinkItem {
  href: string;
  label: string;
}

interface AppNavProps {
  links: NavLinkItem[];
}

export function AppNav({ links }: AppNavProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="Toggle navigation menu"
        className="rounded-md p-2 text-foreground transition-colors hover:bg-muted sm:hidden"
      >
        {open ? (
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
            <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
          </svg>
        ) : (
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
            <path
              fillRule="evenodd"
              d="M2 4.75A.75.75 0 0 1 2.75 4h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 4.75Zm0 10.5a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1-.75-.75ZM2.75 9.25a.75.75 0 0 0 0 1.5h14.5a.75.75 0 0 0 0-1.5H2.75Z"
              clipRule="evenodd"
            />
          </svg>
        )}
      </button>

      <nav className="hidden items-center gap-4 text-sm font-medium text-muted-foreground sm:flex">
        {links.map((link) => (
          <Link key={link.href} href={link.href} className="transition-colors hover:text-foreground">
            {link.label}
          </Link>
        ))}
      </nav>

      {open && (
        <nav className="absolute inset-x-0 top-full z-20 flex flex-col gap-1 border-b border-border bg-card px-4 py-3 shadow-sm sm:hidden">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="rounded-md px-2 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      )}
    </>
  );
}
