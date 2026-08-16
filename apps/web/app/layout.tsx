import type { Metadata } from 'next';
import { Plus_Jakarta_Sans, Noto_Sans_JP } from 'next/font/google';
import { cookies } from 'next/headers';
import { createClient } from '@/shared/supabase/server';
import { APPEARANCE_COOKIE_NAME, parseAppearanceCookie } from '@/shared/appearance/cookie';
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

interface ThemeColors {
  slug: string;
  primary_light: string;
  primary_foreground_light: string;
  secondary_light: string;
  secondary_foreground_light: string;
  accent_light: string;
  accent_foreground_light: string;
  primary_dark: string;
  primary_foreground_dark: string;
  secondary_dark: string;
  secondary_foreground_dark: string;
  accent_dark: string;
  accent_foreground_dark: string;
}

/**
 * Server-rendered CSS variable overrides for the selected theme (T022,
 * research.md §2). Scoped by `[data-theme="<slug>"]` so it layers on top of
 * globals.css's `:root` defaults (which already are the default theme's
 * values) without duplicating every token — only the 6 brand-accent
 * variables vary per theme; surfaces/status colors stay governed by
 * `.dark` alone, identical across all themes.
 */
function ThemeStyle({ theme }: { theme: ThemeColors }) {
  const css = `
[data-theme="${theme.slug}"] {
  --primary: ${theme.primary_light};
  --primary-foreground: ${theme.primary_foreground_light};
  --secondary: ${theme.secondary_light};
  --secondary-foreground: ${theme.secondary_foreground_light};
  --accent: ${theme.accent_light};
  --accent-foreground: ${theme.accent_foreground_light};
}
[data-theme="${theme.slug}"].dark {
  --primary: ${theme.primary_dark};
  --primary-foreground: ${theme.primary_foreground_dark};
  --secondary: ${theme.secondary_dark};
  --secondary-foreground: ${theme.secondary_foreground_dark};
  --accent: ${theme.accent_dark};
  --accent-foreground: ${theme.accent_foreground_dark};
}`.trim();

  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieValue = parseAppearanceCookie(cookies().get(APPEARANCE_COOKIE_NAME)?.value);
  const mode = cookieValue?.mode ?? 'light';
  const themeSlug = cookieValue?.themeSlug;

  // No override needed when there's no theme slug at all — globals.css's
  // :root defaults already are the default theme's values. If the slug
  // doesn't resolve (deleted theme, FR-017), the same "no override" fallback
  // applies automatically since `theme` stays null.
  let theme: ThemeColors | null = null;
  if (themeSlug) {
    const supabase = createClient();
    const { data } = await supabase
      .from('themes')
      .select(
        'slug, primary_light, primary_foreground_light, secondary_light, secondary_foreground_light, accent_light, accent_foreground_light, primary_dark, primary_foreground_dark, secondary_dark, secondary_foreground_dark, accent_dark, accent_foreground_dark',
      )
      .eq('slug', themeSlug)
      .maybeSingle();
    theme = data;
  }

  return (
    <html lang="en" className={mode === 'dark' ? 'dark' : undefined} data-theme={theme?.slug}>
      <head>{theme && <ThemeStyle theme={theme} />}</head>
      <body className={`${plusJakartaSans.variable} ${notoSansJP.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
