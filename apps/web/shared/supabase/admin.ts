import { createClient as createSupabaseClient } from '@supabase/supabase-js';

/**
 * Service-role Supabase client — bypasses RLS entirely. Server-only by
 * convention: it reads `SUPABASE_SERVICE_ROLE_KEY`, which is never exposed
 * to the client bundle (no `NEXT_PUBLIC_` prefix), so importing this from a
 * Client Component would fail at runtime with an undefined key rather than
 * silently leaking the key to the browser. Only import from Route Handlers,
 * Server Components, or Server Actions.
 *
 * Per research.md §1/§2 and data-model.md's RLS Summary: this is the ONLY
 * client that may read/write global reference rows (`vocab_entries`/
 * `grammar_points` where `user_id IS NULL`, `grammar_confusable_pairs`) or
 * perform cross-user admin operations (`app/api/admin/**`, `app/admin/**`).
 * Never import this in a Client Component or expose `SUPABASE_SERVICE_ROLE_KEY`
 * to the browser.
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
