/**
 * Running-total stats for the reading/listening log history (shared by both
 * ReadingLogPage and ListeningLogPage). Without this, the only way to sense
 * "how much have I practiced lately" was scrolling the raw history list and
 * eyeballing it — the same gap the habit tracker's summary tiles closed.
 */
export interface SessionLike {
  practiced_at: string;
  duration_min: number;
}

export interface SessionStats {
  weekSessions: number;
  weekMinutes: number;
  monthSessions: number;
  monthMinutes: number;
  totalSessions: number;
  totalMinutes: number;
}

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0 = Sunday
  const diffToMonday = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diffToMonday);
  return d;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function computeSessionStats(logs: SessionLike[], now: Date = new Date()): SessionStats {
  const weekStart = startOfWeek(now);
  const monthStart = startOfMonth(now);

  let weekSessions = 0;
  let weekMinutes = 0;
  let monthSessions = 0;
  let monthMinutes = 0;
  let totalSessions = 0;
  let totalMinutes = 0;

  for (const log of logs) {
    const practicedAt = new Date(log.practiced_at);
    totalSessions += 1;
    totalMinutes += log.duration_min;
    if (practicedAt >= monthStart) {
      monthSessions += 1;
      monthMinutes += log.duration_min;
    }
    if (practicedAt >= weekStart) {
      weekSessions += 1;
      weekMinutes += log.duration_min;
    }
  }

  return { weekSessions, weekMinutes, monthSessions, monthMinutes, totalSessions, totalMinutes };
}
