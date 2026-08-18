import { AlertTriangle } from 'lucide-react';

/**
 * "Days remaining" countdown widget (T064, US5 acceptance scenario 3). Pure
 * calculation from an exam date — no client state of its own needed, so it
 * has no 'use client' directive and can be rendered from either a Server
 * Component (dashboard, T077) or ExamDateSetting's client tree.
 *
 * This is meant to double as a dashboard-level motivational widget (per
 * DESIGN.md, the exam countdown is one of the few places `accent` is
 * explicitly sanctioned), so the urgent state (<=14 days) goes beyond just
 * tinting the number — it gets a badge and a larger number so it reads as
 * genuinely time-sensitive rather than a routine stat.
 */
interface ExamCountdownWidgetProps {
  examDate: string | null;
}

export function ExamCountdownWidget({ examDate }: ExamCountdownWidgetProps) {
  if (!examDate) {
    return (
      <p className="text-sm text-muted-foreground">Set your exam date to see a countdown.</p>
    );
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${examDate}T00:00:00`);
  const daysRemaining = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (daysRemaining < 0) {
    return <p className="text-sm text-muted-foreground">Exam date has passed.</p>;
  }

  const urgent = daysRemaining <= 14;

  return (
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
      <span
        className={`font-bold tracking-tight ${urgent ? 'text-4xl text-accent sm:text-5xl' : 'text-3xl text-foreground'}`}
      >
        {daysRemaining}
      </span>
      <span className="text-sm text-muted-foreground">
        {daysRemaining === 1 ? 'day' : 'days'} until the exam ({target.toLocaleDateString()})
      </span>
      {urgent && (
        <span className="badge-accent flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" aria-hidden="true" />
          Exam soon
        </span>
      )}
    </div>
  );
}
