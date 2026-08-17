# JanGo — Design System

This is the binding reference for JanGo's UI. Every page in the app — Kanban, the JLPT N2
learning tools (vocab/grammar SRS, reading/listening logs, mock tests, mistake notebook),
notes, habit tracker, settings, and the admin panel — should read as one product built from
these tokens and component conventions, not a per-page reinvention.

Style: clean, minimal productivity/dashboard UI with real elevation (cards actually lift off
the page) and subtle micro-interactions (150–300ms color/opacity/shadow transitions, **no
layout-shifting hover transforms** — important around the Kanban drag-and-drop surface). SVG
icons only, one library (Lucide) — no emoji, no hand-rolled icon paths.

## Why this palette (redesign rationale)

The previous pass (teal primary `#0d9488` + orange accent `#f97316`) was a safe, generic
SaaS-dashboard combination — it didn't look broken, but it also didn't look like *anything in
particular*, which is why a second look at the shipped app still read as "ugly"/templated.

The new palette is **indigo (primary) + sky (secondary) + amber (accent)** — nicknamed
"Japan Blue" after 藍色 (*ai-iro*), the deep indigo from traditional Japanese aizome dyeing,
long associated with Japan the way "British racing green" is with the UK. For an app whose
entire second half is a JLPT N2 study tracker, that's a real reason to pick indigo over generic
SaaS blue/teal, not just "a nicer hex code." Amber (not orange) as the CTA/urgent accent reads
warmer and less "AI-purple-adjacent" than the previous orange while staying clearly distinct
from indigo. Every token pair below is WCAG AA-verified (contrast ratios in the table).

**Typography was deliberately left alone.** Plus Jakarta Sans + Noto Sans JP was already a
correct, well-reasoned choice for mixed Latin+Japanese text (matching x-height, no
serif/sans clash) — replacing it would be churn for its own sake. The actual gaps were the
generic palette, a single flat 8px-everywhere radius, no shadow/elevation system, and every
page hand-rolling its own slightly-different button/input/card utility string. This redesign
fixes those instead.

## Color roles

Defined as CSS variables in `app/globals.css` (light `:root`, dark `:root.dark`), wired into
Tailwind in `tailwind.config.ts`. **Do not add new color roles without updating both files.**

| Role | Light | Dark | Use |
|---|---|---|---|
| `background` | `#F7F7FC` | `#0B0B1A` | page background |
| `foreground` | `#16162B` | `#EDEDF7` | body text |
| `card` | `#FFFFFF` | `#14142B` | cards, panels, modals, popovers |
| `border` | `#DCDCEE` | `#23234A` | dividers, card/input borders |
| `muted` / `muted-foreground` | `#EFEFF8` / `#5B5B7D` | `#1E1E3D` / `#9A9AC0` | secondary surfaces, helper text, disabled fills |
| `primary` / `primary-foreground` | `#4F46E5` / `#F5F3FF` | `#818CF8` / `#1E1B4B` | primary actions, active nav, focus ring, kanban accents |
| `secondary` / `secondary-foreground` | `#0369A1` / `#F0F9FF` | `#38BDF8` / `#082F49` | supporting accent, secondary buttons |
| `accent` / `accent-foreground` | `#D97706` / `#451A03` | `#FBBF24` / `#451A03` | CTA emphasis, due/urgent badges, exam countdown |
| `success` | `#15803D` | `#4ADE80` | mastery/streak-met, positive states |
| `warning` | `#C2410C` | `#FB923C` | due-soon, needs-attention |
| `danger` | `#DC2626` | `#F87171` | overdue/mistake, destructive actions, errors |

**SRS review grading** (`srs-again` / `srs-hard` / `srs-good` / `srs-easy`) intentionally
reuses semantic tokens 1:1 rather than inventing a second color language: `again` = `danger`,
`hard` = `warning`, `good` = `primary`. Only `easy` gets a dedicated blue (`#2563EB` /
`#60A5FA`), since nothing else claims that hue. This keeps grading buttons legible as "a
scale" without colliding with generic CTA/status meaning elsewhere on the page.

### Contrast (WCAG AA, verified)

All body-text and foreground-on-color pairs are ≥ 4.5:1 (large-text/UI pairs ≥ 3:1). Selected
ratios: `foreground`/`background` 16.6:1 light, 16.8:1 dark · `primary-foreground`/`primary`
5.7:1 light, 5.4:1 dark · `accent-foreground`/`accent` 4.7:1 light, 9.0:1 dark ·
`muted-foreground`/`background` 6.1:1 light, 7.2:1 dark. `border` is a decorative divider
(~1.3:1 against `background`/`card`), which is standard practice for hairline dividers and not
subject to the 4.5:1 text-contrast rule (WCAG 1.4.11 governs *required* UI-component
boundaries like input outlines, which additionally get a visible `focus` ring here, not passive
dividers).

### The DB-backed theme system (read before touching color tokens)

JanGo has a **user-facing light/dark + color-theme picker** (`/settings`,
`features/appearance/`) backed by `public.themes` (`apps/supabase/migrations/0017_themes.sql`)
and `public.user_appearance_preferences` (`0018_user_appearance_preferences.sql`). This is a
second layer on top of the CSS variables above — understand it before renaming/restructuring
any color token:

1. `globals.css`'s `:root` / `:root.dark` values are the **default theme's** values (verbatim)
   — used for logged-out visitors (auth pages) and as the SSR fallback before any cookie exists.
2. Each row in `themes` carries its own `primary`/`secondary`/`accent` (+ foregrounds) for both
   modes. `background`/`foreground`/`card`/`border`/`muted` are **not** per-theme — every theme
   shares those, only the three brand-accent variables vary.
3. A signed-in user's resolved mode+theme is cached in a `theme` cookie (full color values, not
   just an id — see `shared/appearance/cookie.ts`) so `app/layout.tsx` never needs a DB round
   trip on every request. It injects a `<style>` scoped to `[data-theme="<slug>"]` overriding
   `--primary`/`--secondary`/`--accent`(+foregrounds).
4. `AppearanceSettingsManager` applies the same variables instantly client-side via
   `element.style.setProperty` on switch (see `applyThemeVars`), ahead of the next full reload.

**Consequence:** the six brand-accent variable *names* (`--primary`, `--primary-foreground`,
`--secondary`, `--secondary-foreground`, `--accent`, `--accent-foreground`) and the `.dark`
class + `[data-theme]` attribute mechanism are load-bearing — do not rename or remove them.
This redesign's new hex values were applied in two places to stay consistent: `globals.css`
(fallback/logged-out) **and** a migration (`0020_update_default_theme_colors.sql`) updating the
`themes` row that was previously "Teal Sunrise" (now "Japan Blue", same row id — existing user
preferences pointing at it upgrade automatically). The other three preset themes (Indigo Berry,
Forest Clay, Slate Rose) are untouched and remain valid alternate picks in Settings.

## Typography

Two font families, both sans, so mixed Latin+Japanese text (e.g. "食べる (taberu) — to eat")
reads as one coherent typeface:

- **Plus Jakarta Sans** (`--font-sans`) — UI copy, headings, forms.
- **Noto Sans JP** (`--font-jp`) — kanji/kana in vocab entries, grammar examples, reading
  passages. Loaded via `next/font/google` with `preload: false` (large CJK glyph set).

`fontFamily.sans` lists both, so the browser falls back to Noto Sans JP for any character Plus
Jakarta Sans doesn't cover automatically. Use `.font-jp` only when a block is *entirely*
Japanese and you want to force it explicitly (e.g. a large kanji flashcard face).

### Type scale

| Use | Classes |
|---|---|
| Page title (h1) | `text-2xl sm:text-3xl font-bold tracking-tight text-foreground` |
| Page subtitle (under h1) | `mt-1.5 text-sm text-muted-foreground` |
| Section heading (h2) | `text-lg font-semibold tracking-tight text-foreground` |
| Card/list-item title (h3) | `text-sm font-semibold text-foreground` |
| Body text | `text-sm text-foreground` (default UI size — this is a dense app, not editorial) |
| Helper/meta text | `text-xs text-muted-foreground` |
| Large kanji/flashcard face | `font-jp text-4xl` or larger, as needed |

Previous pages mostly used `text-xl` for page `h1` (20px) — bump to the scale above; it's the
single biggest legibility/hierarchy fix for pages that otherwise look flat.

## Spacing, radius & shadow scale

- **Spacing:** Tailwind's default 4px scale, used as-is. Page container convention:
  `mx-auto max-w-6xl px-4 py-6 sm:py-8`. Sections within a page: `space-y-6`. Grids of
  cards: `gap-4` (or `gap-3` for dense lists like the board grid).
- **Radius** (`tailwind.config.ts` → `borderRadius`, overrides Tailwind's default scale):
  `rounded-sm` 6px (chips, tiny controls) · `rounded` / `rounded-md` 10px (buttons, inputs,
  dropdowns) · `rounded-lg` 14px (cards, panels, modals) · `rounded-xl` 20px (large feature
  surfaces, e.g. the auth split-panel) · `rounded-full` (pills, avatars, badges). Pick the tier
  by surface type, don't mix radii within one surface family.
- **Shadow** (`tailwind.config.ts` → `boxShadow`, tinted toward `#16162b` instead of pure
  black): `shadow-xs`/`shadow-sm` resting card elevation · `shadow-md` hover/raised state ·
  `shadow-lg`/`shadow-xl` popovers, dropdowns, modals. Dark mode leans more on the
  `border`/`card` step-up than on visible shadow (shadows barely read on dark surfaces) — the
  tokens still apply for consistency, just don't expect them to do much visual work there.

## Icons

**Lucide** (`lucide-react`, already a dependency) is the one icon library for the whole app.
Do not hand-roll new `<svg><path .../></svg>` icons and do not mix in a second icon package.
Standard size `h-4 w-4` inline with text, `h-5 w-5` for nav/toolbar icons, `strokeWidth={1.75}`
if the default (2) looks too heavy at small sizes. Icon-only buttons need `aria-label`.

Existing hand-rolled SVGs (e.g. `AppNav`'s hamburger, `BoardList`'s delete icon) have been
replaced with Lucide equivalents (`Menu`/`X`, `Trash2`) as part of this pass — follow that
pattern for any other hand-rolled icon you touch.

## Component conventions

Reusable primitives now live in `app/globals.css` under `@layer components` — **use these
instead of re-composing the same utility string per page**:

- **Buttons** — `.btn-primary` / `.btn-secondary` / `.btn-outline` / `.btn-ghost` /
  `.btn-danger`. All share height (`h-10`), radius (`rounded`), `focus-visible` ring, disabled
  state, and a 200ms color transition — only the fill changes. Override size with trailing
  utilities when needed (`className="btn-primary h-8 px-3 text-xs"` — utilities always win over
  `components`-layer classes regardless of source order, so this is safe). One primary action
  per view; secondary/destructive actions use the other variants.
- **Cards** — `.card` (static) / `.card-interactive` (adds hover elevation + pointer cursor for
  clickable cards, e.g. board tiles). Never add `bg-white`/`bg-gray-900` directly — always
  `.card` or `bg-card border border-border` so dark mode and the theme picker both work.
- **Forms** — `.label-field` above the input (never placeholder-as-label), `.input-field` /
  `.textarea-field` for controls, `.helper-text` / `.error-text` below. Error state additionally
  gets `border-danger` on the input itself, not just the message below it.
- **Badges** — `.badge-primary` / `.badge-success` / `.badge-warning` / `.badge-danger` /
  `.badge-neutral` (tinted pill) for statuses, counts, due dates.

### A note on opacity modifiers (`bg-danger/10`, `text-primary/80`, etc.)

These color tokens are plain hex strings behind CSS variables (`--danger: #dc2626`), not the
`rgb(var(...) / <alpha-value>)` format Tailwind's opacity modifiers are designed for — changing
that format is off-limits (see "The DB-backed theme system" above; the appearance system writes
raw hex into these same variables). Tailwind still resolves `bg-danger/10` **when it JIT-scans
the class string directly in a `.tsx` file** (falls back to `color-mix()`), which is why this
already works throughout the app (`grep -rn "danger/[0-9]"` finds dozens of working examples) —
keep using it freely in `className` strings. It does **not** work inside an `@apply` block in
`globals.css` (hard build failure, "class does not exist") — inside `@apply`, use
`hover:opacity-90`, a solid color, or a literal `background-color: color-mix(in srgb, var(--x)
12%, transparent);` declaration instead (see `.badge-primary` etc. in `globals.css`).
- **Nav** (`shared/components/AppNav.tsx`, the app/admin shells) — active link:
  `bg-primary/10 text-primary font-semibold`; inactive: `text-muted-foreground
  hover:text-foreground hover:bg-muted`. All nav targets meet the 44×44px touch-target minimum.

## Motion

150–300ms `transition-colors`/`transition-shadow`/`transition-opacity`. No hover transforms
that shift layout (breaks the Kanban drag surface's spatial consistency) — elevation changes
(`shadow-sm` → `shadow-md`) communicate "interactive" instead of `scale`/`translate`. Respect
`prefers-reduced-motion` for anything beyond simple color/opacity/shadow transitions.

## Notes for implementation

- Dark mode is **explicit**, driven by a `.dark` class on `<html>` set server-side from the
  user's persisted preference (never bare `prefers-color-scheme`) — see "The DB-backed theme
  system" above. Users default to light mode regardless of OS preference.
- Use `bg-card border border-border` (or `.card`) for cards/panels, never raw
  `bg-white`/`bg-gray-900`.
- Reserve `accent` (amber) for genuinely urgent/actionable things (overdue task, exam
  countdown, a page's one primary CTA) — don't use it decoratively, or it loses meaning against
  `primary`.
- When adding a new color usage, run it through the contrast check above (or recompute) before
  shipping — don't eyeball it.
