import { redirect } from 'next/navigation';
import { createClient, getAuthedUser } from '@/shared/supabase/server';
import { AppearanceSettingsManager } from '@/features/appearance/components/AppearanceSettingsManager';
import type { Theme } from '@/features/appearance/types';

/**
 * Settings page (T023) — appearance preferences (US2). Server Component
 * fetches the caller's current preference (defaulting to light + the
 * lowest-sort_order theme per FR-016 if no row exists yet) plus every
 * `themes` row for the picker; interactivity lives in the client
 * AppearanceSettingsManager (T027).
 */
export default async function SettingsPage() {
  const supabase = createClient();
  const user = await getAuthedUser();

  if (!user) {
    redirect('/login');
  }

  const [{ data: themes, error: themesError }, { data: preference }] = await Promise.all([
    supabase.from('themes').select('*').order('sort_order', { ascending: true }),
    supabase
      .from('user_appearance_preferences')
      .select('mode, theme_id')
      .eq('user_id', user.id)
      .maybeSingle(),
  ]);

  const themeList = (themes ?? []) as Theme[];
  const defaultThemeId = themeList[0]?.id ?? '';
  const initialMode = preference?.mode === 'dark' ? 'dark' : 'light';
  const initialThemeId = preference?.theme_id ?? defaultThemeId;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="page-heading">Cài đặt</h1>
        <p className="page-intro">
          Chọn giao diện và chế độ hiển thị phù hợp với cách bạn muốn học.
        </p>
      </div>

      {themesError ? (
        <p className="border-danger/30 bg-danger/10 rounded-lg border px-3 py-2 text-sm text-danger">
          Không tải được giao diện: {themesError.message}
        </p>
      ) : themeList.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
          Chưa có giao diện nào được thiết lập.
        </p>
      ) : (
        <AppearanceSettingsManager
          initialMode={initialMode}
          initialThemeId={initialThemeId}
          themes={themeList}
        />
      )}
    </div>
  );
}
