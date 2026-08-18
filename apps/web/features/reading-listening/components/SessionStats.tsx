import { CalendarDays, CalendarRange, Clock } from 'lucide-react';
import { computeSessionStats, type SessionLike } from '../lib/stats';

/**
 * Three summary tiles (sessions/minutes this week, this month, all time) —
 * same `grid-cols-3` tile pattern as the habit tracker's stat row
 * (HabitGridManager.tsx). No client state needed, so this renders straight
 * from the Server Component pages (ReadingLogPage/ListeningLogPage) without
 * a 'use client' boundary.
 */
interface SessionStatsProps {
  logs: SessionLike[];
}

export function SessionStats({ logs }: SessionStatsProps) {
  if (logs.length === 0) return null;

  const stats = computeSessionStats(logs);

  const tiles = [
    {
      icon: CalendarDays,
      label: 'This week',
      sessions: stats.weekSessions,
      minutes: stats.weekMinutes,
    },
    {
      icon: CalendarRange,
      label: 'This month',
      sessions: stats.monthSessions,
      minutes: stats.monthMinutes,
    },
    {
      icon: Clock,
      label: 'All time',
      sessions: stats.totalSessions,
      minutes: stats.totalMinutes,
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {tiles.map((tile) => (
        <div key={tile.label} className="card p-3 sm:p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <tile.icon className="h-4 w-4" aria-hidden="true" />
            <p className="text-xs sm:text-sm">{tile.label}</p>
          </div>
          <p className="mt-1 text-xl font-semibold text-foreground sm:text-2xl">
            {tile.sessions}
            <span className="text-sm font-normal text-muted-foreground"> sess.</span>
          </p>
          <p className="text-xs text-muted-foreground">{tile.minutes} min</p>
        </div>
      ))}
    </div>
  );
}
