'use client';

import { useEffect, useState } from 'react';

/**
 * T095 — Admin usage stats page. Calls T089 (`GET /api/admin/stats`),
 * covering FR-047.
 */
type Stats = {
  totalUsers: number;
  activeUsers7d: number;
  activeUsers30d: number;
  totalTasks: number;
  totalNotes: number;
  totalVocab: number;
};

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-foreground">{value.toLocaleString()}</p>
    </div>
  );
}

export default function AdminStatsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/admin/stats');
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? 'Failed to load stats');
        if (!cancelled) setStats(json);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load stats');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Usage stats</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Aggregate platform usage (FR-047). Active users are measured via
          `profiles.last_active_at`.
        </p>
      </div>

      {error && (
        <div className="rounded-md border border-danger/30 bg-danger/10 px-4 py-2 text-sm text-danger">
          {error}
        </div>
      )}

      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}

      {stats && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatTile label="Total users" value={stats.totalUsers} />
          <StatTile label="Active users (7d)" value={stats.activeUsers7d} />
          <StatTile label="Active users (30d)" value={stats.activeUsers30d} />
          <StatTile label="Total tasks" value={stats.totalTasks} />
          <StatTile label="Total notes" value={stats.totalNotes} />
          <StatTile label="Total vocab entries" value={stats.totalVocab} />
        </div>
      )}
    </div>
  );
}
