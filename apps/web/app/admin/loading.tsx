/** Instant loading UI for the `/admin` route group — see app/(app)/loading.tsx. */
export default function AdminLoading() {
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
