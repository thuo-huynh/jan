import type { ReadingLog } from '../types';

/**
 * Reading comprehension by-passage-type breakdown (T060) — average
 * comprehension score grouped by `passage_type`, surfacing the weakest type
 * (US4 acceptance scenario 3; feeds the dashboard's weak-area summary in
 * US8/T076, but usable standalone here).
 *
 * Single-series magnitude comparison -> sequential one-hue bars (--primary).
 * The weakest type is flagged with the reserved --warning status color +
 * a text label, not color alone (dataviz skill non-negotiables).
 */
interface PassageTypeBreakdownProps {
  logs: ReadingLog[];
}

export function PassageTypeBreakdown({ logs }: PassageTypeBreakdownProps) {
  const scored = logs.filter(
    (log): log is ReadingLog & { comprehension_score: number } =>
      log.comprehension_score !== null,
  );

  if (scored.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Log a reading session with a comprehension score to see a breakdown by passage type.
      </p>
    );
  }

  const byType = new Map<string, { total: number; count: number }>();
  for (const log of scored) {
    const key = log.passage_type?.trim() || 'Unspecified';
    const bucket = byType.get(key) ?? { total: 0, count: 0 };
    bucket.total += log.comprehension_score;
    bucket.count += 1;
    byType.set(key, bucket);
  }

  const rows = Array.from(byType.entries())
    .map(([passageType, { total, count }]) => ({
      passageType,
      average: Math.round(total / count),
      count,
    }))
    .sort((a, b) => a.average - b.average);

  const weakestType = rows[0]?.passageType;

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-foreground">Comprehension by passage type</h2>
      <ul className="space-y-2">
        {rows.map((row) => {
          const isWeakest = row.passageType === weakestType && rows.length > 1;
          return (
            <li key={row.passageType} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-foreground">
                  <span className="font-jp">{row.passageType}</span>
                  {isWeakest && (
                    <span className="rounded-full bg-warning/15 px-2 py-0.5 text-xs font-medium text-warning">
                      Weakest
                    </span>
                  )}
                </span>
                <span className="text-muted-foreground">
                  {row.average}% <span className="text-xs">({row.count})</span>
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${Math.max(row.average, 2)}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
