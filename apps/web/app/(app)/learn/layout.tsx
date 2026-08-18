import { LearnNav } from '@/features/dashboard/components/LearnNav';

/**
 * Shared shell for the eight /learn/* pages — see LearnNav for why this
 * exists (there was previously no way to move between them besides typing
 * a URL).
 */
export default function LearnLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <LearnNav />
      {children}
    </div>
  );
}
