'use client';

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { MockTestResult } from '../types';

/**
 * Score trend chart (T062) — per-section, chronological (US5 acceptance
 * scenario 2). Three-series line chart. Series colors reference the app's
 * own design tokens directly (DESIGN.md "Japan Blue" palette) — `--primary`
 * (indigo), `--accent` (amber), `--secondary` (sky) — rather than a
 * separate chart-only palette, so the chart reads as part of the same
 * product and automatically follows dark mode + the user's theme picker
 * (DESIGN.md "The DB-backed theme system"). These three hues stay
 * distinguishable under deuteranopia/protanopia simulation at this
 * lightness/saturation. Passed as `var(--x)` strings straight into Recharts'
 * SVG `stroke`/`fill` props, same pattern already used below for the grid/
 * axis/tooltip colors — browsers resolve CSS custom properties on SVG
 * presentation attributes natively, no `getComputedStyle` needed.
 */
const SERIES = [
  { key: 'vocab_grammar_score', label: '文字・語彙・文法', color: 'var(--primary)' },
  { key: 'reading_score', label: '読解', color: 'var(--accent)' },
  { key: 'listening_score', label: '聴解', color: 'var(--secondary)' },
] as const;

interface ScoreTrendChartProps {
  results: MockTestResult[];
}

export function ScoreTrendChart({ results }: ScoreTrendChartProps) {
  if (results.length < 2) {
    return (
      <div className="card p-4">
        <p className="text-sm text-muted-foreground">
          Record at least two mock test results to see the score trend.
        </p>
      </div>
    );
  }

  const data = [...results]
    .sort((a, b) => a.test_date.localeCompare(b.test_date))
    .map((r) => ({
      testDate: r.test_date,
      vocab_grammar_score: r.vocab_grammar_score,
      reading_score: r.reading_score,
      listening_score: r.listening_score,
    }));

  const ringColor = 'var(--card)';

  return (
    <div className="card space-y-2 p-4">
      <h2 className="text-sm font-semibold text-foreground">Score trend</h2>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: -16 }}>
          <CartesianGrid stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="testDate"
            tickFormatter={(v: string) => new Date(v).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            stroke="var(--muted-foreground)"
            tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
            axisLine={{ stroke: 'var(--border)' }}
            tickLine={false}
          />
          <YAxis
            stroke="var(--muted-foreground)"
            tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
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
            labelFormatter={(v) => (typeof v === 'string' ? new Date(v).toLocaleDateString() : v)}
            labelStyle={{ color: 'var(--foreground)' }}
          />
          <Legend
            formatter={(value: string) => (
              <span style={{ color: 'var(--muted-foreground)', fontSize: 12 }}>{value}</span>
            )}
            iconType="circle"
            iconSize={8}
          />
          {SERIES.map((s) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={s.color}
              strokeWidth={2}
              dot={{ r: 4, strokeWidth: 2, stroke: ringColor, fill: s.color }}
              activeDot={{ r: 5, strokeWidth: 2, stroke: ringColor }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
