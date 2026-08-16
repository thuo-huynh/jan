import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

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
