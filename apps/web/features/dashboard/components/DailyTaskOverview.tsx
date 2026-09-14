import Link from 'next/link';
import { ArrowRight, Clock3, ListTodo, Sparkles } from 'lucide-react';
import type { TodayTask } from '../lib/home';

interface DailyTaskOverviewProps {
  tasks: TodayTask[];
  overdueCount: number;
  todayCount: number;
  activeFocusTaskId: string | null;
}

const priorityRank: Record<TodayTask['priority'], number> = { high: 0, normal: 1, low: 2 };

function durationLabel(task: TodayTask) {
  const minutes = task.estimatedMinutes ?? 25;
  if (minutes <= 10) return 'Việc nhanh';
  if (minutes <= 30) return '25 phút tập trung';
  return 'Tập trung sâu';
}

/** Daily tasks distilled into the next few actions instead of another board preview. */
export function DailyTaskOverview({
  tasks,
  overdueCount,
  todayCount,
  activeFocusTaskId,
}: DailyTaskOverviewProps) {
  const suggestions = [...tasks]
    .sort((left, right) => {
      const leftDue = left.dueDate ? 0 : 1;
      const rightDue = right.dueDate ? 0 : 1;
      return leftDue - rightDue || priorityRank[left.priority] - priorityRank[right.priority];
    })
    .slice(0, 3);
  const activeTask = activeFocusTaskId ? tasks.find((task) => task.id === activeFocusTaskId) : null;

  return (
    <section className="skill-card p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">Việc hôm nay</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Chọn một việc vừa sức và bắt đầu ngay.
          </p>
        </div>
        <Link href="/boards" className="section-link">
          Mở Daily Tasks
        </Link>
      </div>

      {activeTask && (
        <Link
          href="/boards"
          className="border-primary/30 bg-primary/10 hover:bg-primary/15 mt-4 flex items-center justify-between gap-3 rounded-lg border p-3 transition-colors"
        >
          <span className="min-w-0">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-primary">
              <Clock3 className="h-3.5 w-3.5" aria-hidden="true" /> Đang tập trung
            </span>
            <span className="mt-1 block truncate text-sm font-semibold text-foreground">
              {activeTask.title}
            </span>
          </span>
          <ArrowRight className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
        </Link>
      )}

      {suggestions.length === 0 ? (
        <div className="mt-5 rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
          Chưa có việc nào. Thêm một việc nhỏ để lên kế hoạch cho ngày hôm nay.
        </div>
      ) : (
        <div className="mt-5 space-y-2">
          {suggestions.map((task, index) => (
            <Link
              key={task.id}
              href="/boards"
              className="hover:border-primary/40 hover:bg-muted/50 flex items-center gap-3 rounded-lg border border-border p-3 transition-colors"
            >
              <span className="bg-primary/10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-primary">
                {index + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-foreground">
                  {task.title}
                </span>
                <span className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Sparkles className="h-3 w-3" aria-hidden="true" /> {durationLabel(task)}
                  {task.priority === 'high' && ' · Quan trọng'}
                </span>
              </span>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            </Link>
          ))}
        </div>
      )}

      {(overdueCount > 0 || todayCount > 0) && (
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          {overdueCount > 0 && <span className="badge-danger">{overdueCount} quá hạn</span>}
          {todayCount > 0 && <span className="badge-primary">{todayCount} cần làm hôm nay</span>}
        </div>
      )}
      <Link href="/boards" className="btn-outline mt-5 h-9 w-full justify-center text-sm">
        <ListTodo className="h-4 w-4" aria-hidden="true" /> Sắp xếp việc hôm nay
      </Link>
    </section>
  );
}
