import Link from 'next/link';
import { ArrowRight, CheckCircle2, Target } from 'lucide-react';

/**
 * "Today" quick-glance progress toward the daily goal — same reasoning as
 * the habit tracker's TodayChecklist (features/habits/components/
 * TodayChecklist.tsx): the heatmap is great for spotting long-range
 * patterns but is a poor fit for the single most common question a user
 * has when they land on this page ("am I done for today?"), which
 * otherwise requires hovering the last heatmap cell and doing the
 * subtraction from the goal themselves. This surfaces it directly, with a
 * one-click way to close the gap.
 */
interface TodayProgressProps {
  vocabDone: number;
  vocabTarget: number;
  grammarDone: number;
  grammarTarget: number;
}

function ProgressLine({ label, done, target }: { label: string; done: number; target: number }) {
  const pct = target > 0 ? Math.min(100, Math.round((done / target) * 100)) : 0;
  const met = target > 0 && done >= target;
  const remaining = Math.max(0, target - done);

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="text-foreground">{label}</span>
        <span className={met ? 'font-medium text-success' : 'text-muted-foreground'}>
          {done}/{target}
          {!met && target > 0 && <span className="ml-1 text-xs">({remaining} to go)</span>}
        </span>
      </div>
      <div
        className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-label={`${label} — ${done} of ${target} done today`}
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={`h-full rounded-full transition-[width] ${met ? 'bg-success' : 'bg-primary'}`}
          style={{ width: `${target > 0 ? pct : 0}%` }}
        />
      </div>
    </div>
  );
}

export function TodayProgress({ vocabDone, vocabTarget, grammarDone, grammarTarget }: TodayProgressProps) {
  const noGoalSet = vocabTarget === 0 && grammarTarget === 0;
  const goalMet = !noGoalSet && vocabDone >= vocabTarget && grammarDone >= grammarTarget;

  return (
    <div className="card space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-foreground">Today</h2>
        {goalMet && (
          <span className="badge-success">
            <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
            Goal met
          </span>
        )}
      </div>

      {noGoalSet ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Target className="h-4 w-4 shrink-0" aria-hidden="true" />
          Set a daily goal below to track today&apos;s progress here.
        </p>
      ) : (
        <>
          <div className="space-y-3">
            {vocabTarget > 0 && <ProgressLine label="Vocab & kanji reviews" done={vocabDone} target={vocabTarget} />}
            {grammarTarget > 0 && <ProgressLine label="Grammar reviews" done={grammarDone} target={grammarTarget} />}
          </div>
          {!goalMet && (
            <Link href="/learn/review" className="btn-primary h-9 w-fit px-3 text-xs">
              Review now
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          )}
        </>
      )}
    </div>
  );
}
