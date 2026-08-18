/**
 * Pulsing placeholder rows for admin `<table>` loading states — replaces
 * the bare "Loading…" text cell that most admin tables used (inconsistent
 * with app/admin/stats/page.tsx's animate-pulse card skeleton, which reads
 * as noticeably more polished for the same "data not here yet" moment).
 */
interface TableSkeletonRowsProps {
  columns: number;
  rows?: number;
}

export function TableSkeletonRows({ columns, rows = 5 }: TableSkeletonRowsProps) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <tr key={rowIndex}>
          {Array.from({ length: columns }).map((_, colIndex) => (
            <td key={colIndex} className="px-4 py-3">
              <div className="h-4 w-full max-w-32 animate-pulse rounded bg-muted" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
