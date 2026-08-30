'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BookOpen,
  BookText,
  ChartNoAxesColumnIncreasing,
  House,
  Library,
  Settings,
  Sparkles,
  Target,
} from 'lucide-react';
import type { NavLinkItem } from './AppNav';

const iconByHref = {
  '/learn/dashboard': House,
  '/habits': Target,
  '/learn': BookOpen,
  '/library': Library,
  '/progress': ChartNoAxesColumnIncreasing,
  '/settings': Settings,
  '/admin/users': BookText,
} as const;

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppSidebar({ links }: { links: NavLinkItem[] }) {
  const pathname = usePathname();

  return (
    <aside className="study-sidebar fixed inset-y-3 left-3 z-40 hidden w-56 flex-col rounded-[1.75rem] p-3 lg:flex">
      <Link href="/learn/dashboard" className="flex items-center gap-3 rounded-2xl px-3 py-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
          <Sparkles className="h-5 w-5" aria-hidden="true" />
        </span>
        <span>
          <span className="block text-lg font-bold tracking-[-0.04em] text-foreground">JanGo</span>
          <span className="block text-xs text-muted-foreground">Nhật ký học của bạn</span>
        </span>
      </Link>

      <p className="mt-5 px-3 text-[0.68rem] font-bold uppercase tracking-[0.13em] text-muted-foreground">
        Hành trình hôm nay
      </p>
      <nav className="mt-2 space-y-1">
        {links.map((link) => {
          const active = isActive(pathname, link.href);
          const Icon = iconByHref[link.href as keyof typeof iconByHref] ?? BookOpen;
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? 'page' : undefined}
              className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                active
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <Icon className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden="true" />
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto rounded-2xl bg-muted p-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-card text-2xl shadow-sm" aria-hidden="true">
          🦊
        </div>
        <p className="mt-3 text-sm font-semibold text-foreground">Từng bước một nhé</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">Một việc nhỏ hôm nay cũng là tiến bộ.</p>
      </div>
    </aside>
  );
}
