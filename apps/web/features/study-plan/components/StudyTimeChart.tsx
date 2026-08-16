'use client';

import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

/**
 * Daily/weekly study-time chart (T073, FR-035). `review_logs` (grammar/vocab
 * SRS grading) doesn't track a per-review duration — only reading_logs and
 * listening_logs carry `duration_min` (0005_logs.sql) — so "study time" here
 * is the sum of logged reading + listening minutes per day/week; SRS review
 * activity is already visualized separately by the count-based heatmap
 * (T072). See report for this as a deliberate scope interpretation, not a
 * contract deviation (data-model.md's Review Log note mentions "study time"
 * without a duration column to back it).
 *
 * Single series (minutes) -> one hue (--primary), no legend box needed
 * (dataviz skill: "a single series needs no legend box — the title names it").
 */
export interface StudySession {
  practicedAt: string;
  durationMin: number;
}

interface StudyTimeChartProps {
  sessions: StudySession[];
}

type Granularity = 'daily' | 'weekly';

function isoWeekStart(date: Date): string {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7; // Monday = 0
  d.setDate(d.getDate() - day);
  return d.toISOString().slice(0, 10);
}

export function StudyTimeChart({ sessions }: StudyTimeChartProps) {
  const [granularity, setGranularity] = useState<Granularity>('daily');

  const data = useMemo(() => {
    const totals = new Map<string, number>();
    for (const session of sessions) {
      const date = new Date(session.practicedAt);
      const key = granularity === 'daily' ? session.practicedAt.slice(0, 10) : isoWeekStart(date);
      totals.set(key, (totals.get(key) ?? 0) + session.durationMin);
    }
    return Array.from(totals.entries())
      .map(([bucket, minutes]) => ({ bucket, minutes }))
      .sort((a, b) => a.bucket.localeCompare(b.bucket))
      .slice(-30);
  }, [sessions, granularity]);

  return (
    <div className="space-y-2 rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Study time</h2>
        <div className="flex gap-1 rounded-md border border-border bg-muted p-0.5">
          {(['daily', 'weekly'] as const).map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setGranularity(g)}
              className={`rounded px-2 py-0.5 text-xs font-medium capitalize transition-colors ${
                granularity === g
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {data.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Log reading or listening sessions to see study time here.
        </p>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
            <CartesianGrid stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="bucket"
              tickFormatter={(v: string) => new Date(v).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              stroke="var(--muted-foreground)"
              tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
              axisLine={{ stroke: 'var(--border)' }}
              tickLine={false}
            />
            <YAxis
              stroke="var(--muted-foreground)"
              tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
              axisLine={{ stroke: 'var(--border)' }}
              tickLine={false}
              width={32}
            />
            <Tooltip
              contentStyle={{
                background: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                fontSize: 12,
                color: 'var(--foreground)',
              }}
              formatter={(value) => [`${value} min`, 'Study time']}
              labelFormatter={(v) => (typeof v === 'string' ? new Date(v).toLocaleDateString() : v)}
              labelStyle={{ color: 'var(--foreground)' }}
            />
            <Bar dataKey="minutes" fill="var(--primary)" radius={[4, 4, 0, 0]} maxBarSize={24} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
