'use client';

import { useMemo, useState } from 'react';
import type { DailyActivity } from '../lib/heatmap';

/**
 * GitHub-style contribution heatmap (T072), trailing ~12 months. Magnitude
 * (review count) -> sequential one-hue (--primary) opacity ramp, per the
 * dataviz skill's "sequential = one hue, light->dark" rule — no second hue
 * competing for the same channel. Goal-met (a boolean state, not a
 * magnitude) is layered on as a secondary encoding — a ring, never color
 * alone — and always paired with a text label in the hover tooltip.
 */
interface StreakHeatmapProps {
  /** Dense trailing-N-days array from fillTrailingDays(), oldest first. */
  days: DailyActivity[];
}

const LEVELS = [0, 1, 3, 6, 11] as const;
const OPACITY = [0, 0.3, 0.5, 0.7, 1] as const;

function levelFor(count: number): number {
  let level = 0;
  for (let i = 0; i < LEVELS.length; i++) {
    if (count >= LEVELS[i]) level = i;
  }
  return level;
}

export function StreakHeatmap({ days }: StreakHeatmapProps) {
  const [hovered, setHovered] = useState<DailyActivity | null>(null);

  const weeks = useMemo(() => {
    if (days.length === 0) return [];
    // Align the first column to the Sunday on/before the first day, so every
    // column is a full Sun-Sat week (GitHub-style).
    const first = new Date(`${days[0].date}T00:00:00`);
    const padStart = first.getDay();
    const padded: (DailyActivity | null)[] = [...Array(padStart).fill(null), ...days];

    const cols: (DailyActivity | null)[][] = [];
    for (let i = 0; i < padded.length; i += 7) {
      cols.push(padded.slice(i, i + 7));
    }
    return cols;
  }, [days]);

  const monthLabels = useMemo(() => {
    const labels: { weekIndex: number; label: string }[] = [];
    let lastMonth = -1;
    weeks.forEach((week, weekIndex) => {
      const firstRealDay = week.find((d) => d !== null);
      if (!firstRealDay) return;
      const month = new Date(`${firstRealDay.date}T00:00:00`).getMonth();
      if (month !== lastMonth) {
        labels.push({
          weekIndex,
          label: new Date(`${firstRealDay.date}T00:00:00`).toLocaleDateString('vi-VN', {
            month: 'short',
          }),
        });
        lastMonth = month;
      }
    });
    return labels;
  }, [weeks]);

  return (
    <div className="card space-y-2 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Hoạt động</h2>
        {hovered && (
          <p className="text-xs text-muted-foreground">
            {new Date(`${hovered.date}T00:00:00`).toLocaleDateString('vi-VN')} — {hovered.totalCount}{' '}
            lượt ôn
            {hovered.goalMet && <span className="ml-1 font-medium text-accent">· Đạt mục tiêu</span>}
          </p>
        )}
      </div>

      <div className="overflow-x-auto">
        <div className="inline-block">
          <div className="relative mb-1 h-4" style={{ width: weeks.length * 14 }}>
            {monthLabels.map(({ weekIndex, label }) => (
              <span
                key={weekIndex}
                className="absolute text-[10px] text-muted-foreground"
                style={{ left: weekIndex * 14 }}
              >
                {label}
              </span>
            ))}
          </div>
          <div className="flex gap-[3px]">
            {weeks.map((week, weekIndex) => (
              <div key={weekIndex} className="flex flex-col gap-[3px]">
                {week.map((day, dayIndex) =>
                  day ? (
                    <div
                      key={day.date}
                      onMouseEnter={() => setHovered(day)}
                      onMouseLeave={() => setHovered((h) => (h?.date === day.date ? null : h))}
                      className="h-[11px] w-[11px] rounded-[2px]"
                      style={{
                        backgroundColor: levelFor(day.totalCount) === 0 ? 'var(--muted)' : 'var(--primary)',
                        opacity: levelFor(day.totalCount) === 0 ? 1 : OPACITY[levelFor(day.totalCount)],
                        boxShadow: day.goalMet ? 'inset 0 0 0 1.5px var(--accent)' : undefined,
                      }}
                    />
                  ) : (
                    <div key={`pad-${dayIndex}`} className="h-[11px] w-[11px]" />
                  ),
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
        <span>Ít</span>
        {OPACITY.map((op, i) => (
          <div
            key={i}
            className="h-[10px] w-[10px] rounded-[2px]"
            style={{
              backgroundColor: op === 0 ? 'var(--muted)' : 'var(--primary)',
              opacity: op || undefined,
            }}
          />
        ))}
        <span>Nhiều</span>
        <span className="ml-3 flex items-center gap-1">
          <span
            className="h-[10px] w-[10px] rounded-[2px]"
            style={{ backgroundColor: 'var(--primary)', boxShadow: 'inset 0 0 0 1.5px var(--accent)' }}
          />
          Đạt mục tiêu
        </span>
      </div>
    </div>
  );
}
