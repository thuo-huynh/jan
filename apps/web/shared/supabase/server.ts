import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { cache } from 'react';
import type { User } from '@supabase/supabase-js';

/**
 * Supabase client for use in Server Components, Server Actions, and Route
 * Handlers. Reads/writes the session via Next.js's cookie store per
 * @supabase/ssr's supported App Router pattern (research.md §1).
 *
 * Server Components cannot set cookies (Next.js restriction) — the `set`/
 * `remove` calls there will throw, which is caught and ignored below. Session
 * refresh in that case is instead handled by `apps/web/middleware.ts`, which
 * runs before the Server Component and can write cookies on the response.
 */
export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // Called from a Server Component — middleware handles refresh instead.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch {
            // Called from a Server Component — middleware handles refresh instead.
          }
        },
      },
    },
  );
}

/**
 * `supabase.auth.getUser()` makes a real network round trip to Supabase Auth
 * to revalidate the token (unlike `getSession()`, which just reads the local
 * cookie) — that's the right call for security, but every Server Component
 * in the `(app)`/`admin` route tree was independently calling it again on
 * top of `middleware.ts` and the route group layout already having done so,
 * turning one page load into 2-3 sequential auth round trips before any
 * data-fetching even started (reported as slow page loads/navigation).
 *
 * Wrapping it in React's `cache()` gives "request memoization" (the official
 * Next.js App Router pattern): every call within the same request's render
 * — layout, nested layout, page — resolves to one shared in-flight/resolved
 * call instead of firing a new request each time. Middleware runs in a
 * separate Edge invocation before the RSC render begins, so its own
 * `getUser()` call is unavoidably still separate (kept intentionally, for
 * defense-in-depth route gating), but everything downstream of it now
 * dedupes to a single call.
 */
export const getAuthedUser = cache(async (): Promise<User | null> => {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});
