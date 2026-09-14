'use client';

import type { BoardColumn } from '../types';
import { TaskCard } from './TaskCard';

export function FocusPlanner({ columns, onTaskClick }: { columns: BoardColumn[]; onTaskClick: (id: string) => void }) {
  const tasks = columns.flatMap((column) => column.tasks);
  return <section className="card p-5"><h2 className="text-lg font-semibold">Lên lịch tập trung</h2><p className="mt-1 text-sm text-muted-foreground">Chọn một việc để bắt đầu phiên học 25 phút.</p><div className="mt-4 grid gap-3 md:grid-cols-3">{tasks.map(task => <div key={task.id} className="space-y-2"><TaskCard task={task} onClick={onTaskClick} /><button className="btn-outline h-8 w-full text-xs" type="button">+ Lên lịch 25 phút</button></div>)}</div></section>;
}
