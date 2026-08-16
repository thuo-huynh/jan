# TaskNihongo — Design System

Style: clean, minimal productivity/dashboard UI with subtle micro-interactions (150–300ms
color/opacity transitions, no layout-shifting hover transforms — important around the Kanban
drag-and-drop surface). No emoji icons; use SVG icons (Heroicons/Lucide-style).

## Color roles

Defined as CSS variables in `app/globals.css` (light `:root`, dark via
`@media (prefers-color-scheme: dark)`), wired into Tailwind in `tailwind.config.ts`.

| Role | Light | Dark | Use |
|---|---|---|---|
| `background` | `#F8FAFC` | `#0B1120` | page background |
| `foreground` | `#0F172A` | `#F1F5F9` | body text |
| `card` | `#FFFFFF` | `#111827` | cards, panels, modals |
| `border` | `#E2E8F0` | `#1E293B` | dividers, card borders |
| `muted` / `muted-foreground` | `#F1F5F9` / `#475569` | `#1E293B` / `#94A3B8` | secondary surfaces, helper text |
| `primary` | `#0D9488` (teal-600) | `#2DD4BF` (teal-400) | primary actions, active nav, focus state, kanban accents |
| `secondary` | `#14B8A6` | `#5EEAD4` | supporting accents |
| `accent` | `#F97316` (orange-500) | `#FB923C` | CTA buttons, due/urgent badges, exam countdown |
| `success` / `warning` / `danger` | `#22C55E` / `#F59E0B` / `#EF4444` | `#4ADE80` / `#FBBF24` / `#F87171` | mastery/streak-met, due-soon, overdue/mistake |

**SRS review grading** (`srs-again` / `srs-hard` / `srs-good` / `srs-easy`) uses the familiar
Anki-style red → amber → teal → blue scale — deliberately distinct from `primary`/`accent` so
grading buttons never get confused with generic call-to-action buttons.

## Typography

Two font families, both sans, chosen so mixed Latin+Japanese text (e.g. "食べる (taberu) — to
eat") reads as one coherent typeface rather than clashing serif/sans:

- **Plus Jakarta Sans** (`--font-sans`) — UI copy, headings, forms. Clean/modern, standard choice
  for SaaS dashboards.
- **Noto Sans JP** (`--font-jp`) — kanji/kana in vocab entries, grammar examples, reading
  passages. Loaded via `next/font/google` with `preload: false` (large CJK glyph set).

`fontFamily.sans` in Tailwind lists both (`var(--font-sans), var(--font-jp), ...`) so the browser
automatically falls back to Noto Sans JP for any character Plus Jakarta Sans doesn't cover —
no need to manually switch fonts per-field. Use the `font-jp` utility class only when a block is
*entirely* Japanese and you want to force it explicitly (e.g. a large kanji flashcard face).

## Notes for implementation

- Dark mode is automatic via `prefers-color-scheme` (`darkMode: 'media'` in Tailwind config) —
  no toggle/localStorage state exists yet; add one later only if requested.
- Use `bg-card border border-border` for cards/panels, not raw `bg-white`/`bg-gray-900`, so they
  adapt to dark mode automatically.
- Reserve `accent` (orange) for genuinely urgent/actionable things (overdue task, exam countdown,
  primary form-submit CTA) — don't use it for decoration, or it loses meaning against `primary`.
