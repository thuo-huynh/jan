import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import {
  APPEARANCE_COOKIE_MAX_AGE,
  APPEARANCE_COOKIE_NAME,
  parseAppearanceCookie,
  serializeAppearanceCookie,
  themeRowToColors,
  type ThemeColorRow,
} from '@/shared/appearance/cookie';

const THEME_COLOR_COLUMNS =
  'slug, primary_light, primary_foreground_light, secondary_light, secondary_foreground_light, accent_light, accent_foreground_light, primary_dark, primary_foreground_dark, secondary_dark, secondary_foreground_dark, accent_dark, accent_foreground_dark';

/**
 * Refreshes the Supabase session cookie on every request (research.md §1:
 * middleware-based refresh avoids stale-session edge cases) and redirects
 * unauthenticated requests away from the authenticated `(app)` route group
 * and the `/admin` route group (FR-001, FR-003).
 *
 * Role-based admin gating happens separately in `app/admin/layout.tsx`
 * (server-side, per-request DB read) — this middleware only enforces
 * "is there a session at all," not "is this session an admin."
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options });
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          response.cookies.set({ name, value: '', ...options });
        },
      },
    },
  );

  // IMPORTANT: this call refreshes the session and must not be removed —
  // it's what keeps the auth cookie valid across requests.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isProtectedRoute =
    pathname.startsWith('/admin') ||
    // (app) is a route group and does not appear in the URL; the app shell's
    // routes (boards, learn, notes, habits, settings) are what actually need gating.
    pathname.startsWith('/boards') ||
    pathname.startsWith('/learn') ||
    pathname.startsWith('/notes') ||
    pathname.startsWith('/habits') ||
    pathname.startsWith('/settings');

  if (isProtectedRoute && !user) {
    const redirectUrl = new URL('/login', request.url);
    redirectUrl.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Prime the `theme` cookie (research.md §3) so the very next page render —
  // including this one — already carries an appearance preference, covering
  // every entry path (login, signup, OAuth/email callback, direct URL) from
  // one choke point instead of duplicating this read per auth flow. Checked
  // via parseAppearanceCookie (not raw presence) so a cookie in the older
  // {mode, themeSlug}-only format (pre color-embedding) gets re-primed
  // instead of silently staying stale forever.
  if (user && !parseAppearanceCookie(request.cookies.get(APPEARANCE_COOKIE_NAME)?.value)) {
    const { data: pref } = await supabase
      .from('user_appearance_preferences')
      .select(`mode, themes(${THEME_COLOR_COLUMNS})`)
      .eq('user_id', user.id)
      .maybeSingle();

    let mode: 'light' | 'dark' = 'light';
    let theme: (ThemeColorRow & { slug: string }) | null = null;

    if (pref) {
      mode = pref.mode === 'dark' ? 'dark' : 'light';
      const themesRel = pref.themes as
        | (ThemeColorRow & { slug: string })
        | (ThemeColorRow & { slug: string })[]
        | null;
      theme = Array.isArray(themesRel) ? (themesRel[0] ?? null) : themesRel;
    }

    if (!theme) {
      const { data: defaultTheme } = await supabase
        .from('themes')
        .select(THEME_COLOR_COLUMNS)
        .order('sort_order', { ascending: true })
        .limit(1)
        .maybeSingle();
      theme = defaultTheme;
    }

    if (theme) {
      response.cookies.set(
        APPEARANCE_COOKIE_NAME,
        serializeAppearanceCookie({ mode, themeSlug: theme.slug, colors: themeRowToColors(theme) }),
        {
          maxAge: APPEARANCE_COOKIE_MAX_AGE,
          sameSite: 'lax',
          path: '/',
        },
      );
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static, _next/image (Next.js internals)
     * - favicon.ico
     * - static asset extensions
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
