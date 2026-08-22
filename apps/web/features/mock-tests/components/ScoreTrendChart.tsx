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
import { Minus, TrendingDown, TrendingUp } from 'lucide-react';
import type { MockTestResult } from '../types';

/** Falls back to summing the three section scores when `total_score` wasn't
 * entered directly, so the delta indicator below still works either way. */
function totalFor(r: MockTestResult): number {
  return (
    r.total_score ??
    [r.vocab_grammar_score, r.reading_score, r.listening_score].reduce(
      (sum: number, v) => sum + (v ?? 0),
      0,
    )
  );
}

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
          Ghi ít nhất hai kết quả đề thi thử để xem xu hướng điểm số.
        </p>
      </div>
    );
  }

  const sorted = [...results].sort((a, b) => a.test_date.localeCompare(b.test_date));
  const data = sorted.map((r) => ({
    testDate: r.test_date,
    vocab_grammar_score: r.vocab_grammar_score,
    reading_score: r.reading_score,
    listening_score: r.listening_score,
  }));

  const latest = sorted[sorted.length - 1];
  const previous = sorted[sorted.length - 2];
  const delta = totalFor(latest) - totalFor(previous);
  const TrendIcon = delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;
  const trendColor = delta > 0 ? 'text-success' : delta < 0 ? 'text-warning' : 'text-muted-foreground';

  const ringColor = 'var(--card)';

  return (
    <div className="card space-y-2 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-foreground">Xu hướng điểm số</h2>
        <div className={`flex items-center gap-1.5 text-sm font-medium ${trendColor}`}>
          <TrendIcon className="h-4 w-4" aria-hidden="true" />
          {delta === 0 ? 'Không đổi' : `${delta > 0 ? '+' : ''}${delta} tổng điểm`}
          <span className="font-normal text-muted-foreground">so với lần thi trước</span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: -16 }}>
          <CartesianGrid stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="testDate"
            tickFormatter={(v: string) => new Date(v).toLocaleDateString('vi-VN', { month: 'short', day: 'numeric' })}
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
            labelFormatter={(v) => (typeof v === 'string' ? new Date(v).toLocaleDateString('vi-VN') : v)}
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
