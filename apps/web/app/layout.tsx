import type { Metadata } from 'next';
import { Plus_Jakarta_Sans, Noto_Sans_JP } from 'next/font/google';
import { cookies } from 'next/headers';
import {
  APPEARANCE_COOKIE_NAME,
  parseAppearanceCookie,
  type AppearanceThemeColors,
} from '@/shared/appearance/cookie';
import './globals.css';

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
});

const notoSansJP = Noto_Sans_JP({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-jp',
  display: 'swap',
  preload: false,
});

export const metadata: Metadata = {
  title: 'JanGo',
  description: 'Kanban task management + JLPT N2 Japanese study tracker',
};

/**
 * Server-rendered CSS variable overrides for the selected theme (T022,
 * research.md §2). Scoped by `[data-theme="<slug>"]` so it layers on top of
 * globals.css's `:root` defaults (which already are the default theme's
 * values) without duplicating every token — only the 6 brand-accent
 * variables vary per theme; surfaces/status colors stay governed by
 * `.dark` alone, identical across all themes.
 *
 * Reads colors straight from the `theme` cookie (no Supabase query here) —
 * a DB lookup on every single request in the root layout was a real
 * contributor to slow page loads across the whole app; see
 * shared/appearance/cookie.ts's header comment.
 */
function ThemeStyle({ slug, colors }: { slug: string; colors: AppearanceThemeColors }) {
  const css = `
[data-theme="${slug}"] {
  --primary: ${colors.primaryLight};
  --primary-foreground: ${colors.primaryForegroundLight};
  --secondary: ${colors.secondaryLight};
  --secondary-foreground: ${colors.secondaryForegroundLight};
  --accent: ${colors.accentLight};
  --accent-foreground: ${colors.accentForegroundLight};
}
[data-theme="${slug}"].dark {
  --primary: ${colors.primaryDark};
  --primary-foreground: ${colors.primaryForegroundDark};
  --secondary: ${colors.secondaryDark};
  --secondary-foreground: ${colors.secondaryForegroundDark};
  --accent: ${colors.accentDark};
  --accent-foreground: ${colors.accentForegroundDark};
}`.trim();

  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // No override needed when there's no cookie yet — globals.css's :root
  // defaults already are the default theme's values (an unauthenticated
  // visitor, or the moment before middleware primes the cookie).
  const cookieValue = parseAppearanceCookie(cookies().get(APPEARANCE_COOKIE_NAME)?.value);
  const mode = cookieValue?.mode ?? 'light';

  return (
    <html lang="en" className={mode === 'dark' ? 'dark' : undefined} data-theme={cookieValue?.themeSlug}>
      <head>{cookieValue && <ThemeStyle slug={cookieValue.themeSlug} colors={cookieValue.colors} />}</head>
      <body className={`${plusJakartaSans.variable} ${notoSansJP.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
