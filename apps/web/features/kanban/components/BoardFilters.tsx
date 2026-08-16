'use client';

import type { BoardColumn } from '../types';

export interface BoardFilterState {
  query: string;
  tag: string | null;
  dueBefore: string | null;
  columnId: string | null;
}

export const EMPTY_FILTERS: BoardFilterState = {
  query: '',
  tag: null,
  dueBefore: null,
  columnId: null,
};

interface BoardFiltersProps {
  columns: BoardColumn[];
  filters: BoardFilterState;
  onChange: (filters: BoardFilterState) => void;
}

/** Task filter/search bar (T039): by tag, due date, and column/status (FR-010). */
export function BoardFilters({ columns, filters, onChange }: BoardFiltersProps) {
  const allTags = Array.from(new Set(columns.flatMap((c) => c.tasks.flatMap((t) => t.tags)))).sort();

  const hasActiveFilters = Boolean(filters.query || filters.tag || filters.dueBefore || filters.columnId);

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card p-3">
      <input
        type="search"
        value={filters.query}
        onChange={(e) => onChange({ ...filters, query: e.target.value })}
        placeholder="Search tasks…"
        className="min-w-[10rem] flex-1 rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground outline-none focus:border-primary"
      />

      <select
        value={filters.tag ?? ''}
        onChange={(e) => onChange({ ...filters, tag: e.target.value || null })}
        className="rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground outline-none focus:border-primary"
      >
        <option value="">All tags</option>
        {allTags.map((tag) => (
          <option key={tag} value={tag}>
            {tag}
          </option>
        ))}
      </select>

      <select
        value={filters.columnId ?? ''}
        onChange={(e) => onChange({ ...filters, columnId: e.target.value || null })}
        className="rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground outline-none focus:border-primary"
      >
        <option value="">All columns</option>
        {columns.map((column) => (
          <option key={column.id} value={column.id}>
            {column.name}
          </option>
        ))}
      </select>

      <div className="flex items-center gap-1.5">
        <label htmlFor="due-before" className="text-xs text-muted-foreground">
          Due before
        </label>
        <input
          id="due-before"
          type="date"
          value={filters.dueBefore ?? ''}
          onChange={(e) => onChange({ ...filters, dueBefore: e.target.value || null })}
          className="rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground outline-none focus:border-primary"
        />
      </div>

      {hasActiveFilters && (
        <button
          type="button"
          onClick={() => onChange(EMPTY_FILTERS)}
          className="rounded-md px-2 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
