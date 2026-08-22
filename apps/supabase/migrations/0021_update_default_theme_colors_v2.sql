-- 0021_update_default_theme_colors_v2.sql
-- UI redesign v2 (DESIGN.md "Why this palette v2", 2026-08): the default
-- theme moves from "Japan Blue" (indigo/sky/amber, 0020) to "Aizome
-- Vermillion" (inkier indigo/teal/hanko-red) as part of giving the app a
-- distinctive identity instead of a generic SaaS-dashboard look. Same
-- update-in-place approach as 0020: any user_appearance_preferences.theme_id
-- already pointing at this row (regardless of which slug it had) keeps
-- working and gets the new palette automatically. The other 3 preset themes
-- (Indigo Berry, Forest Clay, Slate Rose) are untouched.
update public.themes
set
  slug = 'aizome-vermillion',
  name = 'Aizome Vermillion',
  primary_light = '#3b4a8c',
  primary_foreground_light = '#f5f3ff',
  secondary_light = '#0f766e',
  secondary_foreground_light = '#f0fdfa',
  accent_light = '#c0392e',
  accent_foreground_light = '#fdf3f0',
  primary_dark = '#8c97e3',
  primary_foreground_dark = '#1e1b4b',
  secondary_dark = '#2dd4bf',
  secondary_foreground_dark = '#042f2b',
  accent_dark = '#f0836f',
  accent_foreground_dark = '#3a0e0a',
  updated_at = now()
where slug = 'japan-blue';
