/**
 * Due-date urgency classification shared by `TaskCard` (per-card badge) and
 * `Board` (board-wide "what's overdue / due today" quick filter). Kept as a
 * single source of truth so the badge shown on a card always agrees with
 * what the quick-filter pills count and select.
 *
 * Mirrors DESIGN.md's semantic split: `danger` = overdue, `accent` =
 * genuinely urgent-today, `warning` = needs attention soon (next 2 days).
 */
export type DueUrgency = 'overdue' | 'today' | 'soon';

export function getDueUrgency(dueDate: string | null): DueUrgency | null {
  if (!dueDate) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(`${dueDate}T00:00:00`);

  const diffDays = Math.round((due.getTime() - today.getTime()) / 86_400_000);
  if (diffDays < 0) return 'overdue';
  if (diffDays === 0) return 'today';
  if (diffDays <= 2) return 'soon';
  return null;
}
