-- 0017_themes.sql
-- themes: global reference data (admin-managed color palettes for the
-- appearance system). See specs/002-habit-tracker-theme/data-model.md
-- "themes". Same global-row shape as vocab_entries/grammar_points
-- (0012_rls_reference_data.sql) — all authenticated users can read, only
-- service-role (admin routes) can write.

create table if not exists public.themes (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  sort_order int not null default 0,
  primary_light text not null,
  primary_foreground_light text not null,
  secondary_light text not null,
  secondary_foreground_light text not null,
  accent_light text not null,
  accent_foreground_light text not null,
  primary_dark text not null,
  primary_foreground_dark text not null,
  secondary_dark text not null,
  secondary_foreground_dark text not null,
  accent_dark text not null,
  accent_foreground_dark text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_themes_sort_order on public.themes (sort_order);

-- 4 default themes (FR-018). Light/dark values for "Teal Sunrise" mirror the
-- app's existing shipped palette (globals.css) exactly, so switching to it
-- reproduces today's look; the other 3 are new palettes built the same way
-- (single accent hue family per theme, light/dark pairs at matching lightness
-- steps to the existing tokens).
insert into public.themes (
  slug, name, sort_order,
  primary_light, primary_foreground_light, secondary_light, secondary_foreground_light, accent_light, accent_foreground_light,
  primary_dark, primary_foreground_dark, secondary_dark, secondary_foreground_dark, accent_dark, accent_foreground_dark
) values
  (
    'teal-sunrise', 'Teal Sunrise', 0,
    '#0d9488', '#f0fdfa', '#14b8a6', '#f0fdfa', '#f97316', '#ffffff',
    '#2dd4bf', '#042f2e', '#5eead4', '#042f2e', '#fb923c', '#431407'
  ),
  (
    'indigo-berry', 'Indigo Berry', 1,
    '#4f46e5', '#eef2ff', '#6366f1', '#eef2ff', '#db2777', '#fdf2f8',
    '#818cf8', '#1e1b4b', '#a5b4fc', '#1e1b4b', '#f472b6', '#500724'
  ),
  (
    'forest-clay', 'Forest Clay', 2,
    '#15803d', '#f0fdf4', '#16a34a', '#f0fdf4', '#c2410c', '#fff7ed',
    '#4ade80', '#052e16', '#86efac', '#052e16', '#fb923c', '#431407'
  ),
  (
    'slate-rose', 'Slate Rose', 3,
    '#334155', '#f8fafc', '#475569', '#f8fafc', '#e11d48', '#fff1f2',
    '#94a3b8', '#0f172a', '#cbd5e1', '#0f172a', '#fb7185', '#4c0519'
  )
on conflict (slug) do nothing;
