import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/shared/supabase/server';
import { appearanceSchema } from '@/shared/validation/schemas';
import {
  APPEARANCE_COOKIE_MAX_AGE,
  APPEARANCE_COOKIE_NAME,
  serializeAppearanceCookie,
} from '@/shared/appearance/cookie';

/**
 * POST /api/appearance — T019.
 *
 * Sets the caller's light/dark mode and/or color theme (contracts/api.md).
 * Upserts `user_appearance_preferences` and writes the `theme` cookie in the
 * same response so the two never drift (research.md §3) — this is the only
 * place either is written from.
 */
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = appearanceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request body', issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const { data: defaultTheme, error: defaultThemeError } = await supabase
    .from('themes')
    .select('id, slug, name')
    .order('sort_order', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (defaultThemeError || !defaultTheme) {
    return NextResponse.json({ error: 'No themes are configured' }, { status: 500 });
  }

  const { data: existing } = await supabase
    .from('user_appearance_preferences')
    .select('mode, theme_id')
    .eq('user_id', user.id)
    .maybeSingle();

  const mode = parsed.data.mode ?? existing?.mode ?? 'light';

  let themeId = parsed.data.themeId ?? existing?.theme_id ?? defaultTheme.id;
  let theme = defaultTheme;

  if (parsed.data.themeId) {
    const { data: requestedTheme, error: themeError } = await supabase
      .from('themes')
      .select('id, slug, name')
      .eq('id', parsed.data.themeId)
      .maybeSingle();
    if (themeError || !requestedTheme) {
      return NextResponse.json({ error: 'themeId does not resolve to an existing theme' }, { status: 400 });
    }
    theme = requestedTheme;
    themeId = requestedTheme.id;
  } else if (existing?.theme_id) {
    const { data: currentTheme } = await supabase
      .from('themes')
      .select('id, slug, name')
      .eq('id', existing.theme_id)
      .maybeSingle();
    if (currentTheme) {
      theme = currentTheme;
      themeId = currentTheme.id;
    }
  }

  const { error: upsertError } = await supabase.from('user_appearance_preferences').upsert(
    { user_id: user.id, mode, theme_id: themeId, updated_at: new Date().toISOString() },
    { onConflict: 'user_id' },
  );
  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 500 });
  }

  const response = NextResponse.json({ mode, theme });
  response.cookies.set(APPEARANCE_COOKIE_NAME, serializeAppearanceCookie({ mode, themeSlug: theme.slug }), {
    maxAge: APPEARANCE_COOKIE_MAX_AGE,
    sameSite: 'lax',
    path: '/',
  });
  return response;
}
