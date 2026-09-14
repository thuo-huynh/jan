'use client';

import { useState } from 'react';
import type { BoardColumn } from '../types';

export function DailyTaskQuickAdd({ columns, onAdd }: { columns: BoardColumn[]; onAdd: (columnId: string, title: string) => Promise<void> | void }) {
  const [open, setOpen] = useState(false); const [title, setTitle] = useState('');
  if (!open) return <button type="button" className="btn-primary mb-5" onClick={() => setOpen(true)}>+ Việc mới</button>;
  return <form className="card mb-5 flex flex-wrap gap-2 p-3" onSubmit={async e => { e.preventDefault(); if (!title.trim() || !columns[0]) return; await onAdd(columns[0].id, title.trim()); setTitle(''); setOpen(false); }}><input autoFocus className="input-field h-10 min-w-56 flex-1" value={title} onChange={e => setTitle(e.target.value)} placeholder="Ví dụ: Ôn 20 từ N2" /><button className="btn-primary h-10" type="submit">Thêm</button><button className="btn-ghost h-10" type="button" onClick={() => setOpen(false)}>Hủy</button></form>;
}
