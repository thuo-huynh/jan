/**
 * "Days remaining" countdown widget (T064, US5 acceptance scenario 3). Pure
 * calculation from an exam date — no client state of its own needed, so it
 * has no 'use client' directive and can be rendered from either a Server
 * Component (dashboard, T077) or ExamDateSetting's client tree.
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
    <div className="flex items-baseline gap-2">
      <span className={`text-3xl font-bold tracking-tight ${urgent ? 'text-accent' : 'text-foreground'}`}>
        {daysRemaining}
      </span>
      <span className="text-sm text-muted-foreground">
        {daysRemaining === 1 ? 'day' : 'days'} until the exam ({target.toLocaleDateString()})
      </span>
    </div>
  );
}
