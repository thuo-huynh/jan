'use client';

import { useCallback, useEffect, useState } from 'react';
import { Inbox, Search } from 'lucide-react';

/**
 * T094 — Admin content moderation page (search/inspect/remove).
 * Calls T088 (`GET /api/admin/content`, `DELETE /api/admin/content/:type/:id`).
 * `grammar_notes` maps to `user_grammar_status.notes_user` (see
 * `app/api/admin/content/_shared.ts`) — deleting one clears the note rather
 * than removing the whole status row, so its action button reads "Clear
 * note" instead of "Delete".
 */
const CONTENT_TYPES = [
  { value: 'tasks', label: 'Tasks' },
  { value: 'notes', label: 'Notes' },
  { value: 'vocab', label: 'Custom vocab' },
  { value: 'grammar_notes', label: 'Grammar notes' },
  { value: 'reading_logs', label: 'Reading logs' },
  { value: 'listening_logs', label: 'Listening logs' },
  { value: 'mistakes', label: 'Mistake notebook' },
] as const;

type ContentType = (typeof CONTENT_TYPES)[number]['value'];

type ContentItem = Record<string, unknown> & { id: string; ownerEmail: string | null };

const PAGE_SIZE = 25;

/** Field(s) used as the primary "what is this" summary text per content type. */
function summaryOf(type: ContentType, item: ContentItem): string {
  switch (type) {
    case 'tasks':
      return String(item.title ?? '');
    case 'notes':
      return String(item.title ?? '');
    case 'vocab':
      return `${item.word ?? ''} — ${item.meaning ?? ''}`;
    case 'grammar_notes':
      return `${item.grammarPattern ?? ''}: ${item.notesUser ?? ''}`;
    case 'reading_logs':
    case 'listening_logs':
      return `${item.source ?? ''} — ${item.comprehensionScore ?? '?'}%`;
    case 'mistakes':
      return String(item.content ?? '');
    default:
      return '';
  }
}

function createdAtOf(item: ContentItem): string | null {
  const value = (item.createdAt ?? item.updatedAt ?? item.practicedAt) as string | undefined;
  return value ?? null;
}

export default function AdminContentPage() {
  const [type, setType] = useState<ContentType>('tasks');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<ContentItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ type, page: String(page) });
      if (query.trim()) params.set('query', query.trim());
      const res = await fetch(`/api/admin/content?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed to load content');
      setItems(json.items);
      setTotal(json.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load content');
    } finally {
      setLoading(false);
    }
  }, [type, page, query]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleRemove(item: ContentItem) {
    const isNote = type === 'grammar_notes';
    const confirmed = window.confirm(
      isNote ? 'Clear this personal note?' : 'Remove this content item? This cannot be undone.',
    );
    if (!confirmed) return;

    setBusyId(item.id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/content/${type}/${item.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Action failed');
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      setTotal((t) => Math.max(0, t - 1));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setBusyId(null);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Content moderation
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Inspect and remove user-generated content (FR-046).
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {CONTENT_TYPES.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => {
              setType(t.value);
              setPage(1);
            }}
            className={
              t.value === type
                ? 'rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground'
                : 'rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted'
            }
          >
            {t.label}
          </button>
        ))}
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
          placeholder="Search content…"
          aria-label="Search content"
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
              <th className="px-4 py-3">Owner</th>
              <th className="px-4 py-3">Summary</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">
                  Loading…
                </td>
              </tr>
            )}
            {!loading && items.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-12">
                  <div className="flex flex-col items-center gap-2 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                      <Inbox className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {query ? 'No items match this search.' : 'No items found.'}
                    </p>
                  </div>
                </td>
              </tr>
            )}
            {!loading &&
              items.map((item) => {
                const createdAt = createdAtOf(item);
                return (
                  <tr key={item.id}>
                    <td className="px-4 py-3 text-muted-foreground">
                      {item.ownerEmail ?? '—'}
                    </td>
                    <td className="max-w-md truncate px-4 py-3 text-foreground">
                      {summaryOf(type, item) || <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {createdAt ? new Date(createdAt).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end">
                        <button
                          type="button"
                          disabled={busyId === item.id}
                          onClick={() => handleRemove(item)}
                          className="btn-outline h-8 border-danger/40 px-3 text-xs text-danger hover:bg-danger/10"
                        >
                          {type === 'grammar_notes' ? 'Clear note' : 'Remove'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Page {page} of {totalPages} ({total} items)
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
