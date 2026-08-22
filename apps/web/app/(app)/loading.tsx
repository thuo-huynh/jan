/**
 * Instant loading UI for the `(app)` route group. Next.js shows this
 * immediately on navigation while the target page's Server Component data
 * fetch is in flight, instead of leaving the previous screen frozen until
 * everything resolves — the app had no loading.tsx anywhere, which read as
 * "not smooth" navigation on top of the slow-load issues fixed alongside
 * this (getAuthedUser() request memoization, cookie-only theme colors).
 */
export default function AppLoading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div
        className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary"
        role="status"
        aria-label="Đang tải"
      />
    </div>
  );
}
