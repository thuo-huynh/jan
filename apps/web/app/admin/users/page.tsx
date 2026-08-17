'use client';

import { useCallback, useEffect, useState } from 'react';
import { Search, Users } from 'lucide-react';

/**
 * T093 — Admin user list/search page + suspend/delete actions.
 * Calls T085 (`GET /api/admin/users`), T086 (`POST /api/admin/users/:id/suspend`),
 * T087 (`DELETE /api/admin/users/:id`). This page renders inside
 * `app/admin/layout.tsx`, which already performs the server-side role gate
 * (FR-003) — no client-side "am I admin" check is needed or trusted here;
 * the route handlers re-verify independently on every call regardless.
 */
type AdminUser = {
  id: string;
  email: string;
  role: 'user' | 'admin';
  status: 'active' | 'suspended';
  signupDate: string;
  lastActiveAt: string;
};

const PAGE_SIZE = 25;

export default function AdminUsersPage() {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (query.trim()) params.set('query', query.trim());
      const res = await fetch(`/api/admin/users?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed to load users');
      setUsers(json.users);
      setTotal(json.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [page, query]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleToggleSuspend(user: AdminUser) {
    setBusyId(user.id);
    setError(null);
    try {
      const nextStatus = user.status === 'suspended' ? 'active' : 'suspended';
      const res = await fetch(`/api/admin/users/${user.id}/suspend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Action failed');
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, status: json.status } : u)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(user: AdminUser) {
    const confirmed = window.confirm(
      `Permanently delete ${user.email} and all their content? This cannot be undone.`,
    );
    if (!confirmed) return;

    setBusyId(user.id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: true }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Delete failed');
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
      setTotal((t) => Math.max(0, t - 1));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setBusyId(null);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Users</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Search, suspend, and delete user accounts (FR-044/FR-045/FR-049).
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          load();
        }}
        className="flex gap-2"
      >
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by email…"
          aria-label="Search by email"
          className="input-field max-w-sm"
        />
        <button type="submit" className="btn-outline shrink-0">
          <Search className="h-4 w-4" aria-hidden="true" />
          Search
        </button>
      </form>

      {error && (
        <div className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-2 text-sm text-danger">
          {error}
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Signed up</th>
              <th className="px-4 py-3">Last active</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">
                  Loading…
                </td>
              </tr>
            )}
            {!loading && users.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12">
                  <div className="flex flex-col items-center gap-2 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                      <Users className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {query ? 'No users match this search.' : 'No users found.'}
                    </p>
                  </div>
                </td>
              </tr>
            )}
            {!loading &&
              users.map((user) => (
                <tr key={user.id}>
                  <td className="px-4 py-3 text-foreground">{user.email}</td>
                  <td className="px-4 py-3 text-muted-foreground">{user.role}</td>
                  <td className="px-4 py-3">
                    <span className={user.status === 'suspended' ? 'badge-danger' : 'badge-success'}>
                      {user.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(user.signupDate).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(user.lastActiveAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        disabled={busyId === user.id}
                        onClick={() => handleToggleSuspend(user)}
                        className="btn-outline h-8 px-3 text-xs"
                      >
                        {user.status === 'suspended' ? 'Reinstate' : 'Suspend'}
                      </button>
                      <button
                        type="button"
                        disabled={busyId === user.id}
                        onClick={() => handleDelete(user)}
                        className="btn-outline h-8 border-danger/40 px-3 text-xs text-danger hover:bg-danger/10"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Page {page} of {totalPages} ({total} users)
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="btn-outline h-8 px-3 text-xs disabled:opacity-40"
          >
            Previous
          </button>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="btn-outline h-8 px-3 text-xs disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
