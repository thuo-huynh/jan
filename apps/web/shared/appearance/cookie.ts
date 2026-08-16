/**
 * Shared shape for the `theme` cookie (research.md §3) — read by
 * `middleware.ts` and `app/layout.tsx`, written by `POST /api/appearance`.
 * A cache of the DB row (`user_appearance_preferences` joined to `themes`),
 * never the source of truth on its own.
 *
 * Carries the theme's actual color values, not just its slug — the first
 * version stored only `{mode, themeSlug}` and made `app/layout.tsx` run a
 * Supabase query on every single request (any page, even public ones) just
 * to resolve those colors, which was a real contributor to slow page loads/
 * navigation (every layout render blocked on a DB round trip). Embedding
 * the colors means the root layout only ever needs to parse this cookie.
 */
export const APPEARANCE_COOKIE_NAME = 'theme';

export const APPEARANCE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

export interface AppearanceThemeColors {
  primaryLight: string;
  primaryForegroundLight: string;
  secondaryLight: string;
  secondaryForegroundLight: string;
  accentLight: string;
  accentForegroundLight: string;
  primaryDark: string;
  primaryForegroundDark: string;
  secondaryDark: string;
  secondaryForegroundDark: string;
  accentDark: string;
  accentForegroundDark: string;
}

export interface AppearanceCookieValue {
  mode: 'light' | 'dark';
  themeSlug: string;
  colors: AppearanceThemeColors;
}

const COLOR_KEYS: (keyof AppearanceThemeColors)[] = [
  'primaryLight',
  'primaryForegroundLight',
  'secondaryLight',
  'secondaryForegroundLight',
  'accentLight',
  'accentForegroundLight',
  'primaryDark',
  'primaryForegroundDark',
  'secondaryDark',
  'secondaryForegroundDark',
  'accentDark',
  'accentForegroundDark',
];

/** Raw `themes` row shape (snake_case DB columns) needed to build a cookie. */
export interface ThemeColorRow {
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

/** Maps a `themes` row to the cookie's camelCase color shape. Used by both `middleware.ts` and `POST /api/appearance` so the mapping lives in one place. */
export function themeRowToColors(row: ThemeColorRow): AppearanceThemeColors {
  return {
    primaryLight: row.primary_light,
    primaryForegroundLight: row.primary_foreground_light,
    secondaryLight: row.secondary_light,
    secondaryForegroundLight: row.secondary_foreground_light,
    accentLight: row.accent_light,
    accentForegroundLight: row.accent_foreground_light,
    primaryDark: row.primary_dark,
    primaryForegroundDark: row.primary_foreground_dark,
    secondaryDark: row.secondary_dark,
    secondaryForegroundDark: row.secondary_foreground_dark,
    accentDark: row.accent_dark,
    accentForegroundDark: row.accent_foreground_dark,
  };
}

export function serializeAppearanceCookie(value: AppearanceCookieValue): string {
  return JSON.stringify(value);
}

export function parseAppearanceCookie(raw: string | undefined): AppearanceCookieValue | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<AppearanceCookieValue>;
    if (
      (parsed.mode === 'light' || parsed.mode === 'dark') &&
      typeof parsed.themeSlug === 'string' &&
      parsed.colors &&
      COLOR_KEYS.every((key) => typeof parsed.colors![key] === 'string')
    ) {
      return { mode: parsed.mode, themeSlug: parsed.themeSlug, colors: parsed.colors as AppearanceThemeColors };
    }
  } catch {
    // Malformed/tampered/stale (pre-color-embedding) cookie — treat as absent.
  }
  return null;
}
