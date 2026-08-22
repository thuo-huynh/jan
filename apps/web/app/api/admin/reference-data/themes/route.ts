import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/shared/supabase/admin-guard';
import { themeSchema } from '@/shared/validation/schemas';

/**
 * T028 — GET/POST/PUT/DELETE /api/admin/reference-data/themes
 * CRUD on `themes` (global reference data, FR-012/FR-015). Same shape as
 * the vocab/grammar/confusable-pairs reference-data routes — service-role
 * client via requireAdmin(), no `user_id` filter since `themes` has no
 * per-user rows at all (unlike vocab_entries/grammar_points).
 */
export async function GET() {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;
  const { admin } = guard;

  const { data, error } = await admin.from('themes').select('*').order('sort_order', { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ items: data ?? [] });
}

export async function POST(request: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;
  const { admin } = guard;

  const json = await request.json().catch(() => null);
  const parsed = themeSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { data, error } = await admin
    .from('themes')
    .insert({
      slug: parsed.data.slug,
      name: parsed.data.name,
      sort_order: parsed.data.sortOrder ?? 0,
      primary_light: parsed.data.primaryLight,
      primary_foreground_light: parsed.data.primaryForegroundLight,
      secondary_light: parsed.data.secondaryLight,
      secondary_foreground_light: parsed.data.secondaryForegroundLight,
      accent_light: parsed.data.accentLight,
      accent_foreground_light: parsed.data.accentForegroundLight,
      primary_dark: parsed.data.primaryDark,
      primary_foreground_dark: parsed.data.primaryForegroundDark,
      secondary_dark: parsed.data.secondaryDark,
      secondary_foreground_dark: parsed.data.secondaryForegroundDark,
      accent_dark: parsed.data.accentDark,
      accent_foreground_dark: parsed.data.accentForegroundDark,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

const updateSchema = themeSchema.partial().extend({ id: z.string().uuid() });

export async function PUT(request: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;
  const { admin } = guard;

  const json = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { id, ...fields } = parsed.data;

  const fieldMap: Record<string, string> = {
    slug: 'slug',
    name: 'name',
    sortOrder: 'sort_order',
    primaryLight: 'primary_light',
    primaryForegroundLight: 'primary_foreground_light',
    secondaryLight: 'secondary_light',
    secondaryForegroundLight: 'secondary_foreground_light',
    accentLight: 'accent_light',
    accentForegroundLight: 'accent_foreground_light',
    primaryDark: 'primary_dark',
    primaryForegroundDark: 'primary_foreground_dark',
    secondaryDark: 'secondary_dark',
    secondaryForegroundDark: 'secondary_foreground_dark',
    accentDark: 'accent_dark',
    accentForegroundDark: 'accent_foreground_dark',
  };

  const updatePayload: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) updatePayload[fieldMap[key]] = value;
  }
  updatePayload.updated_at = new Date().toISOString();

  const { data, error } = await admin.from('themes').update(updatePayload).eq('id', id).select().maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 });
  return NextResponse.json(data);
}

export async function DELETE(request: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;
  const { admin } = guard;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Cần tham số id' }, { status: 400 });

  const { data, error } = await admin.from('themes').delete().eq('id', id).select('id').maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 });
  return NextResponse.json({ id, deleted: true });
}
