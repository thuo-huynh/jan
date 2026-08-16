import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import {
  APPEARANCE_COOKIE_MAX_AGE,
  APPEARANCE_COOKIE_NAME,
  serializeAppearanceCookie,
} from '@/shared/appearance/cookie';

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
  // one choke point instead of duplicating this read per auth flow.
  if (user && !request.cookies.get(APPEARANCE_COOKIE_NAME)) {
    const { data: pref } = await supabase
      .from('user_appearance_preferences')
      .select('mode, themes(slug)')
      .eq('user_id', user.id)
      .maybeSingle();

    let mode: 'light' | 'dark' = 'light';
    let themeSlug: string | null = null;

    if (pref) {
      mode = pref.mode === 'dark' ? 'dark' : 'light';
      const themesRel = pref.themes as { slug: string } | { slug: string }[] | null;
      themeSlug = Array.isArray(themesRel) ? (themesRel[0]?.slug ?? null) : (themesRel?.slug ?? null);
    }

    if (!themeSlug) {
      const { data: defaultTheme } = await supabase
        .from('themes')
        .select('slug')
        .order('sort_order', { ascending: true })
        .limit(1)
        .maybeSingle();
      themeSlug = defaultTheme?.slug ?? null;
    }

    if (themeSlug) {
      response.cookies.set(APPEARANCE_COOKIE_NAME, serializeAppearanceCookie({ mode, themeSlug }), {
        maxAge: APPEARANCE_COOKIE_MAX_AGE,
        sameSite: 'lax',
        path: '/',
      });
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
