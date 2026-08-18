'use client';

import { useMemo, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { MistakeEntryForm } from './MistakeEntryForm';
import { MistakeRow } from './MistakeRow';
import type { GrammarLinkOption, MistakeEntry, VocabLinkOption } from '../types';

/**
 * Mistake notebook page body (T065) — resolved/open filter + manual-entry
 * form (T066) + list of MistakeRow (T068/T069). Client wrapper around the
 * server-fetched initial data, same shape as CustomVocabManager/NoteFilters.
 */
type FilterTab = 'open' | 'resolved' | 'all';
type SourceFilter = 'all' | 'manual' | 'mock_test';

interface MistakeNotebookManagerProps {
  initialMistakes: MistakeEntry[];
  vocabOptions: VocabLinkOption[];
  grammarOptions: GrammarLinkOption[];
}

export function MistakeNotebookManager({
  initialMistakes,
  vocabOptions,
  grammarOptions,
}: MistakeNotebookManagerProps) {
  const [mistakes, setMistakes] = useState(initialMistakes);
  const [adding, setAdding] = useState(false);
  const [filter, setFilter] = useState<FilterTab>('open');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');

  const openCount = useMemo(() => mistakes.filter((m) => !m.resolved).length, [mistakes]);
  const resolvedCount = mistakes.length - openCount;

  const filtered = useMemo(() => {
    return mistakes
      .filter((m) => (filter === 'all' ? true : filter === 'resolved' ? m.resolved : !m.resolved))
      .filter((m) => (sourceFilter === 'all' ? true : m.source === sourceFilter));
  }, [mistakes, filter, sourceFilter]);

  function handleCreated(entry: MistakeEntry) {
    setMistakes((prev) => [entry, ...prev]);
    setAdding(false);
  }

  function handleResolvedChange(id: string, resolved: boolean) {
    setMistakes((prev) => prev.map((m) => (m.id === id ? { ...m, resolved } : m)));
  }

  const tabs: { key: FilterTab; label: string; count: number }[] = [
    { key: 'open', label: 'Open', count: openCount },
    { key: 'resolved', label: 'Resolved', count: resolvedCount },
    { key: 'all', label: 'All', count: mistakes.length },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1 rounded border border-border bg-muted p-1">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setFilter(tab.key)}
                className={`rounded px-3 py-1 text-sm font-medium transition-colors ${
                  filter === tab.key
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.label} <span className="text-xs">({tab.count})</span>
              </button>
            ))}
          </div>
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value as SourceFilter)}
            aria-label="Filter by source"
            className="input-field h-9 w-auto text-sm"
          >
            <option value="all">All sources</option>
            <option value="manual">Manual</option>
            <option value="mock_test">Mock test</option>
          </select>
        </div>
        <button type="button" onClick={() => setAdding((v) => !v)} className="btn-primary h-9 px-3 text-sm">
          {adding ? (
            <>
              <X className="h-4 w-4" aria-hidden="true" />
              Close
            </>
          ) : (
            <>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add mistake
            </>
          )}
        </button>
      </div>

      {adding && (
        <MistakeEntryForm
          vocabOptions={vocabOptions}
          grammarOptions={grammarOptions}
          onCreated={handleCreated}
          onCancel={() => setAdding(false)}
        />
      )}

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">
            {mistakes.length === 0
              ? 'No mistakes logged yet.'
              : filter === 'open' && sourceFilter === 'all'
                ? 'No open mistakes — nice work.'
                : 'No entries match this filter.'}
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((mistake) => (
            <MistakeRow key={mistake.id} mistake={mistake} onResolvedChange={handleResolvedChange} />
          ))}
        </ul>
      )}
    </div>
  );
}
