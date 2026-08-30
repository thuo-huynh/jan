/**
 * Route-level placeholder for every /learn page. The LearnLayout (including
 * its tabs) stays visible while Supabase-backed Server Components fetch, so
 * navigation feels immediate rather than frozen.
 */
export default function LearnLoading() {
  return (
    <div className="space-y-6" role="status" aria-label="Đang tải nội dung học tập">
      <section className="animate-pulse rounded-[1.5rem] border border-border bg-card p-6 sm:p-8">
        <div className="h-3 w-28 rounded-full bg-muted" />
        <div className="mt-4 h-9 max-w-sm rounded-xl bg-muted" />
        <div className="mt-3 h-4 max-w-xl rounded-full bg-muted" />
        <div className="mt-2 h-4 w-2/3 rounded-full bg-muted" />
      </section>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(18rem,.7fr)]">
        <div className="animate-pulse rounded-2xl border border-border bg-card p-6">
          <div className="h-5 w-36 rounded-full bg-muted" />
          <div className="mt-6 space-y-3">
            <div className="h-14 rounded-xl bg-muted" />
            <div className="h-14 rounded-xl bg-muted" />
            <div className="h-14 rounded-xl bg-muted" />
          </div>
        </div>
        <div className="animate-pulse rounded-2xl border border-border bg-card p-6">
          <div className="h-5 w-28 rounded-full bg-muted" />
          <div className="mt-6 h-32 rounded-2xl bg-muted" />
        </div>
      </div>
      <span className="sr-only">Đang tải dữ liệu từ kho học</span>
    </div>
  );
}
