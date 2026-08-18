'use client';

import { Search, X } from 'lucide-react';
import type { DueUrgency } from '../lib/urgency';
import type { BoardColumn } from '../types';

export interface BoardFilterState {
  query: string;
  tag: string | null;
  dueBefore: string | null;
  columnId: string | null;
  /** Set by the "N overdue" / "N due today" quick-filter pills above this bar. */
  urgency: DueUrgency | null;
}

export const EMPTY_FILTERS: BoardFilterState = {
  query: '',
  tag: null,
  dueBefore: null,
  columnId: null,
  urgency: null,
};

interface BoardFiltersProps {
  columns: BoardColumn[];
  filters: BoardFilterState;
  onChange: (filters: BoardFilterState) => void;
}

/** Task filter/search bar (T039): by tag, due date, and column/status (FR-010). */
export function BoardFilters({ columns, filters, onChange }: BoardFiltersProps) {
  const allTags = Array.from(new Set(columns.flatMap((c) => c.tasks.flatMap((t) => t.tags)))).sort();

  const hasActiveFilters = Boolean(
    filters.query || filters.tag || filters.dueBefore || filters.columnId || filters.urgency,
  );

  return (
    <div className="card mb-4 flex flex-wrap items-center gap-2 p-3">
      <div className="relative min-w-[10rem] flex-1">
        <Search
          className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <input
          type="search"
          value={filters.query}
          onChange={(e) => onChange({ ...filters, query: e.target.value })}
          placeholder="Search tasks…"
          className="input-field h-9 pl-8"
        />
      </div>

      <select
        value={filters.tag ?? ''}
        onChange={(e) => onChange({ ...filters, tag: e.target.value || null })}
        className="input-field h-9 w-auto"
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
        className="input-field h-9 w-auto"
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
          className="input-field h-9 w-auto"
        />
      </div>

      {hasActiveFilters && (
        <button type="button" onClick={() => onChange(EMPTY_FILTERS)} className="btn-ghost h-9 px-2.5 text-xs">
          <X className="h-3.5 w-3.5" aria-hidden="true" />
          Clear filters
        </button>
      )}
    </div>
  );
}
