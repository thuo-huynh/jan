-- 0020_update_default_theme_colors.sql
-- UI redesign (DESIGN.md "Japan Blue" palette, 2026-08): the app's shipped
-- default look moved from teal/orange to indigo/sky/amber. `app/globals.css`
-- `:root` / `:root.dark` are the source of truth and already carry the new
-- hex values; this migration brings the DB-side "default theme" row (the
-- lowest-`sort_order` theme in `public.themes`, applied via
-- middleware.ts/app/layout.tsx to every signed-in user who hasn't picked a
-- theme, and to existing users whose preference already points at this row)
-- in line so both paths render the same palette instead of the appearance
-- system silently reverting everyone to the old teal look.
--
-- UPDATE (not delete+insert) on the existing 'teal-sunrise' row on purpose:
-- any user_appearance_preferences.theme_id already pointing at this row
-- keeps working and instantly gets the new palette, with no data migration
-- needed. Slug/name are renamed to match what the colors now actually are;
-- no application code references the 'teal-sunrise' slug string (checked —
-- only this table and its original seed migration did).
update public.themes
set
  slug = 'japan-blue',
  name = 'Japan Blue',
  primary_light = '#4f46e5',
  primary_foreground_light = '#f5f3ff',
  secondary_light = '#0369a1',
  secondary_foreground_light = '#f0f9ff',
  accent_light = '#d97706',
  accent_foreground_light = '#451a03',
  primary_dark = '#818cf8',
  primary_foreground_dark = '#1e1b4b',
  secondary_dark = '#38bdf8',
  secondary_foreground_dark = '#082f49',
  accent_dark = '#fbbf24',
  accent_foreground_dark = '#451a03',
  updated_at = now()
where slug = 'teal-sunrise';
