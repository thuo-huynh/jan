'use client';

import { useMemo, useState } from 'react';
import { CalendarPlus, Clock3, Trash2 } from 'lucide-react';
import { createClient } from '@/shared/supabase/client';
import type { BoardColumn, FocusBlock } from '../types';
import { TaskCard } from './TaskCard';

const FOCUS_DURATION_MINUTES = 25;

interface FocusPlannerProps {
  columns: BoardColumn[];
  focusBlocks: FocusBlock[];
  onFocusBlocksChange: (blocks: FocusBlock[]) => void;
  onTaskClick: (taskId: string) => void;
}

function formatFocusTime(value: string) {
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
  }).format(new Date(value));
}

export function FocusPlanner({
  columns,
  focusBlocks,
  onFocusBlocksChange,
  onTaskClick,
}: FocusPlannerProps) {
  const tasks = useMemo(() => columns.flatMap((column) => column.tasks), [columns]);
  const taskById = useMemo(() => new Map(tasks.map((task) => [task.id, task])), [tasks]);
  const [savingTaskId, setSavingTaskId] = useState<string | null>(null);
  const [removingBlockId, setRemovingBlockId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function scheduleFocusBlock(taskId: string) {
    setSavingTaskId(taskId);
    setError(null);

    const startsAt = new Date();
    const endsAt = new Date(startsAt.getTime() + FOCUS_DURATION_MINUTES * 60 * 1000);
    const { data, error: insertError } = await createClient()
      .from('focus_blocks')
      .insert({
        task_id: taskId,
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
      })
      .select('id, task_id, starts_at, ends_at, created_at')
      .single();

    if (insertError || !data) {
      setError(
        'Không thể tạo phiên tập trung. Hãy chạy daily-planning.sql trên Supabase rồi thử lại.'
      );
      setSavingTaskId(null);
      return;
    }

    onFocusBlocksChange([...focusBlocks, data as FocusBlock]);
    setSavingTaskId(null);
  }

  async function removeFocusBlock(blockId: string) {
    setRemovingBlockId(blockId);
    setError(null);

    const { error: deleteError } = await createClient()
      .from('focus_blocks')
      .delete()
      .eq('id', blockId);

    if (deleteError) {
      setError('Không thể hủy phiên tập trung. Vui lòng thử lại.');
      setRemovingBlockId(null);
      return;
    }

    onFocusBlocksChange(focusBlocks.filter((block) => block.id !== blockId));
    setRemovingBlockId(null);
  }

  return (
    <div className="space-y-5">
      <section className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Planner tập trung</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Bấm “Bắt đầu 25 phút” để tạo một phiên học cho công việc, bắt đầu ngay bây giờ.
            </p>
          </div>
          <span className="badge-primary px-3 py-1.5 font-semibold">
            <Clock3 className="size-3.5" /> {FOCUS_DURATION_MINUTES} phút
          </span>
        </div>

        {error && (
          <p className="bg-danger/10 mt-4 rounded-lg border border-danger px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}

        <div className="mt-5 border-t border-border pt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Phiên đã lên lịch
          </p>
          {focusBlocks.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">
              Chưa có phiên tập trung nào. Chọn một công việc bên dưới để bắt đầu.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {focusBlocks.map((block) => {
                const task = taskById.get(block.task_id);
                return (
                  <li
                    key={block.id}
                    className="bg-muted/40 flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5"
                  >
                    <button
                      type="button"
                      className="min-w-0 text-left"
                      onClick={() => task && onTaskClick(task.id)}
                    >
                      <p className="truncate text-sm font-medium text-foreground">
                        {task?.title ?? 'Công việc đã bị xóa'}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {formatFocusTime(block.starts_at)} –{' '}
                        {new Intl.DateTimeFormat('vi-VN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        }).format(new Date(block.ends_at))}
                      </p>
                    </button>
                    <button
                      type="button"
                      aria-label="Hủy phiên tập trung"
                      title="Hủy phiên tập trung"
                      disabled={removingBlockId === block.id}
                      onClick={() => removeFocusBlock(block.id)}
                      className="hover:bg-danger/10 rounded-lg p-2 text-muted-foreground transition-colors hover:text-danger disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center gap-2">
          <CalendarPlus className="size-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Chọn công việc để tập trung</h2>
        </div>
        {tasks.length === 0 ? (
          <div className="card p-6 text-center text-sm text-muted-foreground">
            Chưa có công việc nào để lên lịch.
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {tasks.map((task) => (
              <div key={task.id} className="card overflow-hidden">
                <TaskCard task={task} onClick={() => onTaskClick(task.id)} />
                <div className="border-t border-border px-3 py-3">
                  <button
                    type="button"
                    disabled={savingTaskId === task.id}
                    onClick={() => scheduleFocusBlock(task.id)}
                    className="btn-primary h-10 w-full justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Clock3 className="size-4" />
                    {savingTaskId === task.id
                      ? 'Đang tạo phiên…'
                      : `Bắt đầu ${FOCUS_DURATION_MINUTES} phút`}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
