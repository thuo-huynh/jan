'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { CalendarDays, Check, ChevronDown, Columns3, Search, Tags, X } from 'lucide-react';
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

interface FilterMenuProps {
  label: string;
  icon: ReactNode;
  value: string | null;
  options: { value: string; label: string }[];
  onChange: (value: string | null) => void;
}

function FilterMenu({ label, icon, value, options, onChange }: FilterMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const selected = options.find((option) => option.value === value)?.label;
  const visibleValue = selected ?? `Tất cả ${label.toLowerCase()}`;

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setIsOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsOpen(false);
    }

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  function select(value: string | null) {
    onChange(value);
    setIsOpen(false);
  }

  return (
    <div ref={menuRef} className="relative min-w-0">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={`Lọc theo ${label}: ${visibleValue}`}
        onClick={() => setIsOpen((open) => !open)}
        className="input-field flex h-10 w-full items-center gap-2 px-3 text-left hover:border-primary"
      >
        <span className="shrink-0 text-muted-foreground">{icon}</span>
        <span className="min-w-0 flex-1 truncate">{visibleValue}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <div
          role="listbox"
          aria-label={label}
          className="absolute z-30 mt-2 max-h-64 w-full min-w-56 overflow-y-auto rounded-lg border border-border bg-card p-1.5 shadow-lg"
        >
          <button
            type="button"
            role="option"
            aria-selected={!value}
            onClick={() => select(null)}
            className="flex w-full items-center gap-2 rounded px-2.5 py-2 text-left text-sm text-foreground transition-colors hover:bg-muted focus:bg-muted focus:outline-none"
          >
            <span className="flex h-4 w-4 items-center justify-center">
              {!value && <Check className="h-4 w-4 text-primary" aria-hidden="true" />}
            </span>
            Tất cả {label.toLowerCase()}
          </button>
          {options.length === 0 ? (
            <p className="px-2.5 py-2 text-sm text-muted-foreground">
              Chưa có {label.toLowerCase()}.
            </p>
          ) : (
            options.map((option) => (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={value === option.value}
                onClick={() => select(option.value)}
                className="flex w-full items-center gap-2 rounded px-2.5 py-2 text-left text-sm text-foreground transition-colors hover:bg-muted focus:bg-muted focus:outline-none"
              >
                <span className="flex h-4 w-4 items-center justify-center">
                  {value === option.value && (
                    <Check className="h-4 w-4 text-primary" aria-hidden="true" />
                  )}
                </span>
                <span className="truncate">{option.label}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

/** Task filter/search bar: by text, tag, due date, and column status. */
export function BoardFilters({ columns, filters, onChange }: BoardFiltersProps) {
  const allTags = Array.from(
    new Set(columns.flatMap((c) => c.tasks.flatMap((t) => t.tags)))
  ).sort();
  const hasActiveFilters = Boolean(
    filters.query || filters.tag || filters.dueBefore || filters.columnId || filters.urgency
  );
  return (
    <section
      className="card mb-6 overflow-visible p-3 shadow-xs sm:p-4"
      aria-label="Bộ lọc công việc"
    >
      <div className="grid items-end gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1.6fr)_minmax(9rem,0.7fr)_minmax(9rem,0.7fr)_minmax(11rem,0.8fr)_auto]">
        <div className="min-w-0">
          <label htmlFor="task-search" className="label-field mb-1.5 flex items-center gap-1.5">
            <Search className="h-3.5 w-3.5" aria-hidden="true" />
            Tìm công việc
          </label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              id="task-search"
              type="search"
              value={filters.query}
              onChange={(event) => onChange({ ...filters, query: event.target.value })}
              placeholder="Tên hoặc nội dung công việc"
              className="input-field h-10 pl-10"
            />
          </div>
        </div>

        <div className="min-w-0">
          <p className="label-field mb-1.5 flex items-center gap-1.5" id="tag-filter-label">
            <Tags className="h-3.5 w-3.5" aria-hidden="true" />
            Nhãn
          </p>
          <FilterMenu
            label="nhãn"
            icon={<Tags className="h-4 w-4" aria-hidden="true" />}
            value={filters.tag}
            options={allTags.map((tag) => ({ value: tag, label: tag }))}
            onChange={(tag) => onChange({ ...filters, tag })}
          />
        </div>

        <div className="min-w-0">
          <p className="label-field mb-1.5 flex items-center gap-1.5" id="column-filter-label">
            <Columns3 className="h-3.5 w-3.5" aria-hidden="true" />
            Trạng thái
          </p>
          <FilterMenu
            label="trạng thái"
            icon={<Columns3 className="h-4 w-4" aria-hidden="true" />}
            value={filters.columnId}
            options={columns.map((column) => ({ value: column.id, label: column.name }))}
            onChange={(columnId) => onChange({ ...filters, columnId })}
          />
        </div>

        <div className="min-w-0">
          <label htmlFor="due-before" className="label-field mb-1.5 flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
            Hạn hoàn thành
          </label>
          <div className="relative">
            <CalendarDays
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              id="due-before"
              type="date"
              lang="vi"
              value={filters.dueBefore ?? ''}
              onChange={(event) => onChange({ ...filters, dueBefore: event.target.value || null })}
              className="input-field h-10 w-full pl-10 pr-16"
            />
            {filters.dueBefore && (
              <button
                type="button"
                aria-label="Xóa hạn hoàn thành"
                title="Xóa hạn hoàn thành"
                onClick={() => onChange({ ...filters, dueBefore: null })}
                className="absolute right-9 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={() => onChange(EMPTY_FILTERS)}
            className="btn-ghost h-10 shrink-0 px-2.5 text-xs xl:mb-0"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
            Xóa lọc
          </button>
        )}
      </div>
    </section>
  );
}
