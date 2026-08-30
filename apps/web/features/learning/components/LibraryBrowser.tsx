'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, BookOpen, Headphones, Languages, Library } from 'lucide-react';
import type { LibraryMaterial, LearningCategory } from '../lib/summary';

const labels: Record<LearningCategory | 'all', string> = { all: 'Tất cả', vocabulary: 'Từ vựng', grammar: 'Ngữ pháp', reading: 'Đọc', listening: 'Nghe' };
const icons = { vocabulary: Library, grammar: Languages, reading: BookOpen, listening: Headphones };

export function LibraryBrowser({ materials }: { materials: LibraryMaterial[] }) {
  const [category, setCategory] = useState<LearningCategory | 'all'>('all');
  const [query, setQuery] = useState('');
  const results = useMemo(() => materials.filter((item) => (category === 'all' || item.category === category) && `${item.title} ${item.description}`.toLowerCase().includes(query.trim().toLowerCase())), [category, materials, query]);
  return <div className="space-y-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="flex gap-1 overflow-x-auto pb-1">{(Object.keys(labels) as (LearningCategory | 'all')[]).map((key) => <button key={key} type="button" onClick={() => setCategory(key)} className={category === key ? 'btn-primary h-9 px-3 text-sm' : 'btn-ghost h-9 px-3 text-sm'}>{labels[key]}</button>)}</div><input value={query} onChange={(event) => setQuery(event.target.value)} className="input-field w-full sm:max-w-xs" placeholder="Tìm trong thư viện" aria-label="Tìm trong thư viện" /></div><div className="grid gap-4 md:grid-cols-2">{results.map((item) => { const Icon = icons[item.category]; return <Link key={item.category} href={item.href} className="card-interactive group p-5 sm:p-6"><Icon className="h-6 w-6 text-primary" strokeWidth={1.6} aria-hidden="true" /><div className="mt-8 flex items-end justify-between gap-4"><div><p className="text-lg font-semibold text-foreground">{item.title}</p><p className="mt-1 text-sm leading-6 text-muted-foreground">{item.description}</p></div><ArrowRight className="h-5 w-5 shrink-0 text-primary transition-transform group-hover:translate-x-0.5" aria-hidden="true" /></div><p className="mt-5 text-sm font-medium text-primary">{item.itemCount} {item.category === 'listening' ? 'buổi đã ghi' : 'bộ tài liệu'}</p></Link>; })}</div>{results.length === 0 && <p className="card p-8 text-center text-sm text-muted-foreground">Chưa có tài liệu phù hợp. Thử một từ khóa hoặc nhóm khác.</p>}</div>;
}
