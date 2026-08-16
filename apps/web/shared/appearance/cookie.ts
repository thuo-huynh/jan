/**
 * Shared shape for the `theme` cookie (research.md §3) — read by
 * `middleware.ts` and `app/layout.tsx`, written by `POST /api/appearance`.
 * A thin JSON cache of the DB row (`user_appearance_preferences` joined to
 * `themes`), never the source of truth on its own.
 */
export const APPEARANCE_COOKIE_NAME = 'theme';

export const APPEARANCE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

export interface AppearanceCookieValue {
  mode: 'light' | 'dark';
  themeSlug: string;
}

export function serializeAppearanceCookie(value: AppearanceCookieValue): string {
  return JSON.stringify(value);
}

export function parseAppearanceCookie(raw: string | undefined): AppearanceCookieValue | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<AppearanceCookieValue>;
    if ((parsed.mode === 'light' || parsed.mode === 'dark') && typeof parsed.themeSlug === 'string') {
      return { mode: parsed.mode, themeSlug: parsed.themeSlug };
    }
  } catch {
    // Malformed/tampered cookie — treat as absent.
  }
  return null;
}
