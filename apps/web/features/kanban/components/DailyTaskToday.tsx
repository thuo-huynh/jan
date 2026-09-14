import type { BoardColumn } from '../types';
import { TaskCard } from './TaskCard';

export function DailyTaskToday({ columns, date, onTaskClick }: { columns: BoardColumn[]; date: string; onTaskClick: (id: string) => void }) {
  const tasks = columns.flatMap((column) => column.tasks.map((task) => ({ task, column })));
  const overdue = tasks.filter(({ task }) => task.due_date && task.due_date < date);
  const today = tasks.filter(({ task }) => task.due_date === date);
  const upcoming = tasks.filter(({ task }) => task.due_date && task.due_date > date).sort((a,b) => a.task.due_date!.localeCompare(b.task.due_date!)).slice(0, 5);
  const groups = [['Quá hạn', overdue], ['Hôm nay', today], ['Tiếp theo', upcoming]] as const;
  return <div className="space-y-5">{groups.map(([title, items]) => <section key={title} className="card p-4"><h2 className="text-sm font-semibold text-foreground">{title}</h2><div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{items.length ? items.map(({ task }) => <TaskCard key={task.id} task={task} onClick={onTaskClick} />) : <p className="text-sm text-muted-foreground">Chưa có công việc.</p>}</div></section>)}</div>;
}
