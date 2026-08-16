import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/shared/supabase/server';

/**
 * PKCE auth callback — exchanges the `?code=` param Supabase appends to
 * confirmation/magic-link emails for a session cookie
 * (`exchangeCodeForSession`, @supabase/ssr's supported App Router flow).
 * Was missing entirely: signup/login only ever called `supabase.auth.signUp`/
 * `signInWithPassword` directly (no `emailRedirectTo`), so confirmation
 * emails fell back to the Supabase project's default Site URL and, even
 * pointed at the right domain, had no route here to actually complete the
 * exchange — the user would land on a page with an unused `?code=` and no
 * session.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const redirectTo = searchParams.get('redirectTo') ?? '/boards';

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${redirectTo}`);
    }
  }

  return NextResponse.redirect(`${origin}/login`);
}
