'use client';

import { useCallback, useState, type FormEvent } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

/**
 * Folder/tag filters + pinned-only toggle (T078) and the full-text search
 * bar (T082), combined into one filter bar since they all drive the same
 * URL search params that the (Server Component) notes list page reads.
 * Navigation via `router.push` with an updated query string re-triggers the
 * server-side fetch/filter in `app/(app)/notes/page.tsx`.
 */
export function NoteFilters({
  folderOptions,
  tagOptions,
}: {
  folderOptions: string[];
  tagOptions: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') ?? '');

  const folder = searchParams.get('folder') ?? '';
  const tag = searchParams.get('tag') ?? '';
  const pinnedOnly = searchParams.get('pinned') === '1';

  const pushParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === '') {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }
      const qs = params.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname);
    },
    [pathname, router, searchParams],
  );

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    pushParams({ q: query.trim() || null });
  }

  const hasActiveFilters = Boolean(folder || tag || pinnedOnly || searchParams.get('q'));

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <form onSubmit={handleSearchSubmit} className="flex w-full max-w-sm items-center gap-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search notes…"
          aria-label="Search notes"
          className="input-field h-9"
        />
        <button type="submit" className="btn-outline h-9 shrink-0 px-3 text-xs">
          Search
        </button>
      </form>

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={folder}
          onChange={(e) => pushParams({ folder: e.target.value || null })}
          aria-label="Filter by folder"
          className="h-9 rounded border border-border bg-card px-2 text-sm text-foreground focus:border-primary focus:outline-none"
        >
          <option value="">All folders</option>
          {folderOptions.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>

        <select
          value={tag}
          onChange={(e) => pushParams({ tag: e.target.value || null })}
          aria-label="Filter by tag"
          className="h-9 rounded border border-border bg-card px-2 text-sm text-foreground focus:border-primary focus:outline-none"
        >
          <option value="">All tags</option>
          {tagOptions.map((t) => (
            <option key={t} value={t}>
              #{t}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => pushParams({ pinned: pinnedOnly ? null : '1' })}
          aria-pressed={pinnedOnly}
          className={`h-9 rounded border px-3 text-sm font-medium transition-colors ${
            pinnedOnly
              ? 'border-accent/40 bg-accent/10 text-accent'
              : 'border-border text-muted-foreground hover:text-foreground'
          }`}
        >
          Pinned only
        </button>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              router.push(pathname);
            }}
            className="text-sm font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}
