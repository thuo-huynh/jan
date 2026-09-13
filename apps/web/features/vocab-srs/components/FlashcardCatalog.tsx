'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { BookOpenCheck, LibraryBig, Play, RotateCw, Search } from 'lucide-react';
import type { SharedFlashcardDeckSummary } from '../types';

interface FlashcardCatalogProps {
  decks: SharedFlashcardDeckSummary[];
  totalCardCount: number;
  dueCount: number;
  personalSetCount: number;
}

/** Client-side catalog filters keep deck discovery instant without duplicating server queries. */
export function FlashcardCatalog({
  decks,
  totalCardCount,
  dueCount,
  personalSetCount,
}: FlashcardCatalogProps) {
  const [query, setQuery] = useState('');
  const [level, setLevel] = useState('all');
  const [label, setLabel] = useState('all');
  const levels = Array.from(
    new Set(decks.map((deck) => deck.jlptLevel).filter(Boolean))
  ) as string[];
  const labels = Array.from(new Set(decks.flatMap((deck) => deck.labels))).sort((a, b) =>
    a.localeCompare(b, 'vi')
  );
  const visibleDecks = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('vi');
    return decks.filter(
      (deck) =>
        (level === 'all' || deck.jlptLevel === level) &&
        (label === 'all' || deck.labels.includes(label)) &&
        (!needle ||
          `${deck.title} ${deck.description ?? ''} ${deck.labels.join(' ')}`
            .toLocaleLowerCase('vi')
            .includes(needle))
    );
  }, [decks, label, level, query]);

  function clearFilters() {
    setQuery('');
    setLevel('all');
    setLabel('all');
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="page-heading">Flashcards</h1>
        <p className="page-intro">
          Chọn một bộ từ phù hợp, học theo nhịp của bạn và quay lại ôn đúng lúc.
        </p>
      </div>

      <section className="grid gap-4 lg:grid-cols-2" aria-label="Tổng quan Flashcards">
        <div className="daily-sheet">
          <div className="relative z-10 flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-card shadow-sm">
                  <LibraryBig className="h-4 w-4 text-primary" aria-hidden="true" />
                </span>
                Tổng số thẻ
              </div>
              <p className="mt-7 text-4xl font-bold tracking-tight text-foreground">
                {totalCardCount}
              </p>
              <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
                Bao gồm kho từ chung và những từ bạn tự thêm.
              </p>
              <Link
                href="/learn/vocab/flashcards?source=global"
                className="btn-primary mt-5 h-9 px-3 text-sm"
              >
                Xem kho từ chung
              </Link>
            </div>
            <BookOpenCheck
              className="text-primary/20 h-16 w-16"
              strokeWidth={1.25}
              aria-hidden="true"
            />
          </div>
        </div>

        <div className="daily-sheet">
          <div className="relative z-10 flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-card shadow-sm">
                  <RotateCw className="h-4 w-4 text-primary" aria-hidden="true" />
                </span>
                Thẻ cần ôn
              </div>
              <p className="mt-7 text-4xl font-bold tracking-tight text-foreground">{dueCount}</p>
              <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
                Ôn lại để giữ kiến thức trước khi bạn quên.
              </p>
              <Link
                href="/learn/review"
                className={
                  dueCount > 0
                    ? 'btn-primary mt-5 h-9 px-3 text-sm'
                    : 'btn-outline mt-5 h-9 px-3 text-sm'
                }
              >
                {dueCount > 0 ? 'Ôn tập ngay' : 'Xem lịch ôn'}
              </Link>
            </div>
            <RotateCw className="text-primary/20 h-16 w-16" strokeWidth={1.25} aria-hidden="true" />
          </div>
        </div>
      </section>

      <section className="card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">Bộ từ của bạn</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {personalSetCount > 0
              ? `Bạn đang có ${personalSetCount} bộ từ riêng để học theo cách của mình.`
              : 'Tạo bộ từ riêng từ những từ bạn tự thêm hoặc lưu lại.'}
          </p>
        </div>
        <Link href="/learn/vocab" className="btn-outline h-9 shrink-0 px-3 text-sm">
          Quản lý bộ từ
        </Link>
      </section>

      <section className="space-y-5" aria-labelledby="shared-decks-heading">
        <div className="flex flex-col gap-4 border-b border-border pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2
              id="shared-decks-heading"
              className="text-xl font-bold tracking-tight text-foreground"
            >
              Flashcards phổ biến
            </h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Các bộ từ được quản trị viên biên soạn cho bạn.
            </p>
          </div>
          <label className="relative block w-full lg:max-w-sm">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <span className="sr-only">Tìm bộ Flashcards</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Nhập để tìm kiếm"
              className="input-field pl-9"
            />
          </label>
        </div>

        <div className="space-y-3">
          <div>
            <p className="mb-2 text-xs font-semibold text-muted-foreground">Cấp độ</p>
            <div className="flex flex-wrap gap-2">
              {['all', ...levels].map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setLevel(item)}
                  className={
                    level === item
                      ? 'badge-primary ring-primary/30 ring-1'
                      : 'badge-neutral hover:bg-muted/80'
                  }
                >
                  {item === 'all' ? 'Tất cả' : item}
                </button>
              ))}
            </div>
          </div>
          {labels.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold text-muted-foreground">Nhãn</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setLabel('all')}
                  className={
                    label === 'all'
                      ? 'badge-primary ring-primary/30 ring-1'
                      : 'badge-neutral hover:bg-muted/80'
                  }
                >
                  Tất cả danh mục
                </button>
                {labels.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setLabel(item)}
                    className={
                      label === item
                        ? 'badge-primary ring-primary/30 ring-1'
                        : 'badge-neutral hover:bg-muted/80'
                    }
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {visibleDecks.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visibleDecks.map((deck) => {
              const progress =
                deck.cardCount === 0 ? 0 : Math.round((deck.reviewedCount / deck.cardCount) * 100);
              return (
                <article key={deck.id} className="card flex min-h-64 flex-col p-5">
                  <div className="flex items-start justify-between gap-3">
                    <span className="badge-primary">{deck.jlptLevel ?? 'Từ vựng'}</span>
                    <span className="text-xs font-medium text-muted-foreground">
                      {deck.cardCount} thẻ
                    </span>
                  </div>
                  <h3 className="mt-5 text-base font-semibold tracking-tight text-foreground">
                    {deck.title}
                  </h3>
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
                    {deck.description || 'Bộ từ vựng được chọn lọc để bạn bắt đầu học ngay.'}
                  </p>
                  {deck.labels.length > 0 && (
                    <p className="mt-3 truncate text-xs text-muted-foreground">
                      #{deck.labels.join(' #')}
                    </p>
                  )}
                  <div className="mt-auto pt-5">
                    <div
                      className="h-1.5 overflow-hidden rounded-full bg-muted"
                      aria-label={`${progress}% đã ôn`}
                    >
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                      <span>{deck.reviewedCount} đã ôn</span>
                      <span>{progress}%</span>
                    </div>
                    <Link
                      href={`/learn/vocab/flashcards?deck=${deck.id}`}
                      className="btn-outline mt-4 h-9 w-full px-3 text-sm"
                    >
                      <Play className="h-4 w-4" aria-hidden="true" />
                      Học bộ này
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="card flex flex-col items-center gap-3 py-12 text-center">
            <LibraryBig className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
            <div>
              <p className="text-sm font-semibold text-foreground">
                Chưa tìm thấy bộ Flashcards phù hợp
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Thử đổi từ khóa hoặc bộ lọc của bạn.
              </p>
            </div>
            {(query || level !== 'all' || label !== 'all') && (
              <button type="button" onClick={clearFilters} className="btn-outline h-9 px-3 text-sm">
                Xóa bộ lọc
              </button>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
