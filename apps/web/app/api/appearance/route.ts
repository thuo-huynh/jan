import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/shared/supabase/server';
import { appearanceSchema } from '@/shared/validation/schemas';
import {
  APPEARANCE_COOKIE_MAX_AGE,
  APPEARANCE_COOKIE_NAME,
  serializeAppearanceCookie,
  themeRowToColors,
  type ThemeColorRow,
} from '@/shared/appearance/cookie';

/**
 * POST /api/appearance — T019.
 *
 * Sets the caller's light/dark mode and/or color theme (contracts/api.md).
 * Upserts `user_appearance_preferences` and writes the `theme` cookie in the
 * same response so the two never drift (research.md §3) — this is the only
 * place either is written from. The cookie carries the theme's full color
 * values (not just its slug) so `app/layout.tsx` never has to query the DB
 * to render them — see shared/appearance/cookie.ts's header comment.
 */
export const dynamic = 'force-dynamic';

const THEME_COLUMNS =
  'id, slug, name, primary_light, primary_foreground_light, secondary_light, secondary_foreground_light, accent_light, accent_foreground_light, primary_dark, primary_foreground_dark, secondary_dark, secondary_foreground_dark, accent_dark, accent_foreground_dark';

type ThemeRow = ThemeColorRow & { id: string; slug: string; name: string };

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Nội dung JSON không hợp lệ' }, { status: 400 });
  }

  const parsed = appearanceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Nội dung yêu cầu không hợp lệ', issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const { data: defaultTheme, error: defaultThemeError } = await supabase
    .from('themes')
    .select(THEME_COLUMNS)
    .order('sort_order', { ascending: true })
    .limit(1)
    .maybeSingle<ThemeRow>();
  if (defaultThemeError || !defaultTheme) {
    return NextResponse.json({ error: 'Chưa có giao diện nào được thiết lập' }, { status: 500 });
  }

  const { data: existing } = await supabase
    .from('user_appearance_preferences')
    .select('mode, theme_id')
    .eq('user_id', user.id)
    .maybeSingle();

  const mode = parsed.data.mode ?? existing?.mode ?? 'light';

  let themeId = parsed.data.themeId ?? existing?.theme_id ?? defaultTheme.id;
  let theme: ThemeRow = defaultTheme;

  if (parsed.data.themeId) {
    const { data: requestedTheme, error: themeError } = await supabase
      .from('themes')
      .select(THEME_COLUMNS)
      .eq('id', parsed.data.themeId)
      .maybeSingle<ThemeRow>();
    if (themeError || !requestedTheme) {
      return NextResponse.json({ error: 'themeId không khớp với giao diện nào đang tồn tại' }, { status: 400 });
    }
    theme = requestedTheme;
    themeId = requestedTheme.id;
  } else if (existing?.theme_id) {
    const { data: currentTheme } = await supabase
      .from('themes')
      .select(THEME_COLUMNS)
      .eq('id', existing.theme_id)
      .maybeSingle<ThemeRow>();
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

  const response = NextResponse.json({ mode, theme: { id: theme.id, slug: theme.slug, name: theme.name } });
  response.cookies.set(
    APPEARANCE_COOKIE_NAME,
    serializeAppearanceCookie({ mode, themeSlug: theme.slug, colors: themeRowToColors(theme) }),
    {
      maxAge: APPEARANCE_COOKIE_MAX_AGE,
      sameSite: 'lax',
      path: '/',
    },
  );
  return response;
}
