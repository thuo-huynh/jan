# Coding style

- **Server Components by default.** Add `'use client'` only to the specific component that needs
  interactivity/state/browser APIs, not the whole page — pages typically stay a Server Component
  that composes one or two Client Components for the interactive bits (e.g.
  `app/(app)/habits/page.tsx` fetches data server-side and hands it to the client
  `HabitGridManager`; `app/(app)/learn/dashboard/page.tsx` is entirely server-rendered).
- **Comments explain WHY, not WHAT.** This codebase leans on short doc-comments above
  non-obvious functions/components that record the *reason* for a design decision — a past bug,
  a constraint, a task ID, why one approach was chosen over another — never a restatement of what
  the following line does. Match that style; don't narrate obvious code.
- **Pure logic lives in `lib/`, separate from components** — e.g. `features/habits/lib/streak.ts`
  is plain, I/O-free, testable functions that components import and call. Follow this split for
  new aggregation/calculation code instead of inlining it in a component body.
- **Share data-fetching helpers instead of duplicating queries** — e.g.
  `features/dashboard/lib/aggregate.ts`'s `loadDashboardData` is called directly by both the
  dashboard page and its API route so the two can't drift apart. Prefer one function with two
  callers over copy-pasted Supabase queries.
- **Icons**: `lucide-react` only, `h-4 w-4` inline with text / `h-5 w-5` for nav/toolbar,
  icon-only buttons need `aria-label`.
- Don't add new abstractions, feature flags, or defensive error handling for cases that can't
  happen here — this is a solo-user app with Supabase RLS as the trust boundary, not a
  multi-tenant SaaS. Keep changes proportional to what's actually asked.
