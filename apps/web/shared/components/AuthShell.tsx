import { GraduationCap, LayoutGrid, BookOpen, Headphones, ClipboardCheck } from 'lucide-react';

/**
 * Shared shell for /login and /signup (DESIGN.md + design-taste-frontend
 * pre-flight applied to these two pages only — everywhere else in the app is
 * dashboard/product UI that skill explicitly doesn't cover). Asymmetric
 * split: a solid brand-color panel + copy on one side, the actual form on
 * the other. Deliberately not a centered card floating over a gradient
 * background — that's the generic default this redesign is moving away
 * from. The brand panel is identical on both pages (the app's identity
 * doesn't change depending on which auth action the user is taking); only
 * the form content passed as `children` differs.
 */
const FEATURES = [
  { icon: LayoutGrid, label: 'Bảng Kanban cho công việc hằng ngày' },
  { icon: BookOpen, label: 'Ôn tập ngắt quãng cho từ vựng và ngữ pháp' },
  { icon: Headphones, label: 'Nhật ký luyện đọc và luyện nghe' },
  { icon: ClipboardCheck, label: 'Đề thi thử và sổ lỗi sai' },
] as const;

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-center bg-primary px-12 py-16 text-primary-foreground lg:flex xl:px-20">
        <div className="mx-auto w-full max-w-md">
          <div className="flex items-center gap-2 text-lg font-bold tracking-tight">
            <GraduationCap className="h-7 w-7" aria-hidden="true" />
            JanGo
          </div>
          <h1 className="mt-10 text-3xl font-bold tracking-tight text-balance xl:text-4xl">
            Từng bước chinh phục N2, lưu lại trong một nơi duy nhất.
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-primary-foreground/80">
            Bảng Kanban cho công việc của bạn, ôn tập ngắt quãng cho từ vựng và ngữ pháp, cùng
            nhật ký cho mọi buổi đọc, nghe và thi thử trên chặng đường đó.
          </p>
          <ul className="mt-10 space-y-4">
            {FEATURES.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-3 text-sm">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-foreground/10">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                {label}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-16 xl:px-20">
        <div className="mx-auto flex w-full max-w-sm items-center gap-2 text-base font-bold tracking-tight text-foreground lg:hidden">
          <GraduationCap className="h-6 w-6 text-primary" aria-hidden="true" />
          JanGo
        </div>
        <div className="mx-auto mt-8 w-full max-w-sm lg:mt-0">{children}</div>
      </div>
    </div>
  );
}
