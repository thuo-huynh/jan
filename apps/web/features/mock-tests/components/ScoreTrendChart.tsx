'use client';

import { useEffect, useState } from 'react';
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
 * scenario 2). Three-series line chart; the app's own --primary/--secondary
 * tokens are both teal and fail categorical CVD-separation (validated via
 * dataviz skill's validate_palette.js — normal-vision floor ΔE 10.5, below
 * the 15 floor), so this borrows the dataviz skill's validated 3-slot
 * default (blue/orange/aqua) for series identity only; everything else
 * (surface, grid, text) stays on the app's own design tokens.
 */
const SERIES = [
  { key: 'vocab_grammar_score', label: '文字・語彙・文法', light: '#2a78d6', dark: '#3987e5' },
  { key: 'reading_score', label: '読解', light: '#eb6834', dark: '#d95926' },
  { key: 'listening_score', label: '聴解', light: '#1baf7a', dark: '#199e70' },
] as const;

interface ScoreTrendChartProps {
  results: MockTestResult[];
}

export function ScoreTrendChart({ results }: ScoreTrendChartProps) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    setIsDark(mql.matches);
    const listener = (e: MediaQueryListEvent) => setIsDark(e.matches);
    mql.addEventListener('change', listener);
    return () => mql.removeEventListener('change', listener);
  }, []);

  if (results.length < 2) {
    return (
      <p className="text-sm text-muted-foreground">
        Record at least two mock test results to see the score trend.
      </p>
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

  const ringColor = isDark ? '#111827' : '#ffffff';

  return (
    <div className="space-y-2 rounded-lg border border-border bg-card p-4">
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
              stroke={isDark ? s.dark : s.light}
              strokeWidth={2}
              dot={{ r: 4, strokeWidth: 2, stroke: ringColor, fill: isDark ? s.dark : s.light }}
              activeDot={{ r: 5, strokeWidth: 2, stroke: ringColor }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
