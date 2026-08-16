'use client';

import { createBrowserClient } from '@supabase/ssr';

/**
 * Supabase client for use in Client Components. Reads the publicly-safe
 * anon key — RLS policies (see the 0011/0012 migrations under
 * apps/supabase/migrations/) are the real access-control boundary, not this key.
 *
 * See specs/001-tasknihongo/research.md §1: never read role/session state
 * from a client-only source for authorization decisions — this client is for
 * data access under RLS, not for auth/role checks.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
