'use client';

import { useState } from 'react';
import { BookOpenCheck, NotebookPen } from 'lucide-react';
import { PassageTypeBreakdown } from './PassageTypeBreakdown';
import { ReadingLogManager } from './ReadingLogManager';
import { ReadingPassageBank } from './ReadingPassageBank';
import { SessionStats } from './SessionStats';
import type { ReadingLog, ReadingPassage, ReadingPassageSet } from '../types';

interface ReadingTabsProps {
  readingLogs: ReadingLog[];
  passages: ReadingPassage[];
  passageSets: ReadingPassageSet[];
}

type Tab = 'log' | 'bank';

/**
 * Tab switcher for /learn/reading — the pre-existing practice-session log
 * (unaffected by this feature, per spec.md's Assumptions) alongside the new
 * passage bank (US1-US4). A plain pill-tab switcher, same shape as
 * LearnNav.tsx's sub-nav one level up, kept local to this page rather than
 * promoted to a shared component since no other page needs two tabs yet.
 */
export function ReadingTabs({ readingLogs, passages, passageSets }: ReadingTabsProps) {
  const [tab, setTab] = useState<Tab>('log');

  return (
    <div className="space-y-4">
      <div className="inline-flex gap-1 rounded-lg border border-border bg-muted/40 p-1">
        <button
          type="button"
          onClick={() => setTab('log')}
          aria-pressed={tab === 'log'}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            tab === 'log' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <NotebookPen className="h-4 w-4" aria-hidden="true" />
          Nhật ký luyện tập
        </button>
        <button
          type="button"
          onClick={() => setTab('bank')}
          aria-pressed={tab === 'bank'}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            tab === 'bank' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <BookOpenCheck className="h-4 w-4" aria-hidden="true" />
          Ngân hàng bài đọc
        </button>
      </div>

      {tab === 'log' ? (
        <div className="space-y-6">
          <SessionStats logs={readingLogs} />
          <PassageTypeBreakdown logs={readingLogs} />
          <ReadingLogManager initialLogs={readingLogs} />
        </div>
      ) : (
        <ReadingPassageBank passages={passages} initialSets={passageSets} />
      )}
    </div>
  );
}
