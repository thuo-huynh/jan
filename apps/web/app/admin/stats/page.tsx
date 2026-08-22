'use client';

import { useEffect, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { BookMarked, CheckSquare, StickyNote, TrendingUp, Users } from 'lucide-react';

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

function StatTile({ label, value, icon: Icon }: { label: string; value: number; icon: LucideIcon }) {
  return (
    <div className="card">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" aria-hidden="true" />
        <p className="text-sm">{label}</p>
      </div>
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
        if (!res.ok) throw new Error(json.error ?? 'Không tải được số liệu thống kê');
        if (!cancelled) setStats(json);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Không tải được số liệu thống kê');
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
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Số liệu sử dụng
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Tổng hợp số liệu sử dụng nền tảng. Người dùng hoạt động được đo qua
          `profiles.last_active_at`.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-2 text-sm text-danger">
          {error}
        </div>
      )}

      {loading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card animate-pulse">
              <div className="h-4 w-24 rounded bg-muted" />
              <div className="mt-3 h-8 w-16 rounded bg-muted" />
            </div>
          ))}
        </div>
      )}

      {!loading && stats && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatTile label="Tổng người dùng" value={stats.totalUsers} icon={Users} />
          <StatTile label="Người dùng hoạt động (7 ngày)" value={stats.activeUsers7d} icon={TrendingUp} />
          <StatTile label="Người dùng hoạt động (30 ngày)" value={stats.activeUsers30d} icon={TrendingUp} />
          <StatTile label="Tổng công việc" value={stats.totalTasks} icon={CheckSquare} />
          <StatTile label="Tổng ghi chú" value={stats.totalNotes} icon={StickyNote} />
          <StatTile label="Tổng mục từ vựng" value={stats.totalVocab} icon={BookMarked} />
        </div>
      )}
    </div>
  );
}
