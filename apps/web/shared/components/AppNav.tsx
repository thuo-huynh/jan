'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';

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
 *
 * Active desktop navigation uses a small underline instead of six competing
 * pills. The mobile menu retains a clear filled active state because the
 * vertical list needs a stronger current-location cue.
 */
export interface NavLinkItem {
  href: string;
  label: string;
}

interface AppNavProps {
  links: NavLinkItem[];
}

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppNav({ links }: AppNavProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="Mở/đóng menu điều hướng"
        className="flex h-10 w-10 items-center justify-center rounded text-foreground transition-colors hover:bg-muted sm:hidden"
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      <nav className="hidden h-full items-center gap-1 text-sm font-medium sm:flex">
        {links.map((link) => {
          const active = isActive(pathname, link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? 'page' : undefined}
              className={`flex h-full items-center border-b-2 px-3 transition-colors ${
                active
                  ? 'border-primary font-semibold text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>

      {open && (
        <nav className="absolute inset-x-0 top-full z-20 flex flex-col gap-1 border-b border-border bg-card px-4 py-3 shadow-lg sm:hidden">
          {links.map((link) => {
            const active = isActive(pathname, link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? 'page' : undefined}
                onClick={() => setOpen(false)}
                className={`rounded px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-primary/10 font-semibold text-primary'
                    : 'text-foreground hover:bg-muted'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      )}
    </>
  );
}
