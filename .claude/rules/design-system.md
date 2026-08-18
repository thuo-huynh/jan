# Design system

`apps/web/DESIGN.md` is the **binding** UI reference — read it in full before any non-trivial UI
work. Quick reference for everyday edits:

- **Colors** are CSS variables in `app/globals.css` (`:root` light / `:root.dark` dark), wired
  into Tailwind via `tailwind.config.ts`. Never hardcode a hex value or use `bg-white`/
  `bg-gray-900` — always the token (`bg-card`, `text-foreground`, `border-border`, …). There's
  also a **DB-backed per-user theme picker** layered on top of these variables
  (`features/appearance/`, `/settings`) — read DESIGN.md's "DB-backed theme system" section
  before renaming or adding a color-role variable.
- **Component primitives** live in `app/globals.css` under `@layer components` — reuse them
  instead of re-hand-rolling the same utility string per page: `.btn-primary/secondary/outline/
  ghost/danger`, `.card` / `.card-interactive`, `.badge-primary/success/warning/danger/neutral`,
  `.input-field`/`.textarea-field`/`.label-field`/`.helper-text`/`.error-text`.
- **Motion**: 150–300ms color/opacity/shadow transitions only. No hover transforms that shift
  layout (it breaks the Kanban drag surface's spatial consistency). `features/habits/*` is the
  one deliberate exception — a tick-pop scale animation (`.animate-habit-pop`) and a
  confetti-dot fall (`.animate-confetti-fall`) for streak celebrations, both plain `@keyframes`
  below the `@layer components` block in `globals.css` (`@apply` can't reference
  `animation`/`@keyframes`, hence the separate block). Reuse those keyframes — or add sibling
  ones the same way — for other celebratory/lively UI instead of reaching for an animation
  library.
- **Typography scale**, the **spacing/radius/shadow scale**, and the **opacity-modifier
  gotcha** (`bg-danger/10` resolves fine directly in a `className` string via Tailwind's JIT
  scan, but fails inside `@apply` in `globals.css`) are all documented in DESIGN.md — don't
  rediscover them by trial and error.
