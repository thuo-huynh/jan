'use client';

import { useEffect, useMemo, useState } from 'react';
import { CalendarPlus, CheckCircle2, Clock3, Pause, Play, Trash2 } from 'lucide-react';
import { createClient } from '@/shared/supabase/client';
import type { BoardColumn, FocusBlock } from '../types';
import { TaskCard } from './TaskCard';

const DEFAULT_FOCUS_DURATION_MINUTES = 25;

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

function formatCountdown(totalSeconds: number) {
  const minutes = Math.floor(Math.max(totalSeconds, 0) / 60);
  const seconds = Math.max(totalSeconds, 0) % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function remainingSeconds(block: FocusBlock, now: Date) {
  if (block.status === 'paused') return block.remaining_seconds ?? 0;
  return Math.max(0, Math.ceil((new Date(block.ends_at).getTime() - now.getTime()) / 1000));
}

export function FocusPlanner({
  columns,
  focusBlocks,
  onFocusBlocksChange,
  onTaskClick,
}: FocusPlannerProps) {
  const tasks = useMemo(() => columns.flatMap((column) => column.tasks), [columns]);
  const taskById = useMemo(() => new Map(tasks.map((task) => [task.id, task])), [tasks]);
  const [now, setNow] = useState(() => new Date());
  const [savingTaskId, setSavingTaskId] = useState<string | null>(null);
  const [updatingBlockId, setUpdatingBlockId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  const activeBlock = focusBlocks.find((block) => block.status === 'active') ?? null;
  const visibleBlocks = focusBlocks.filter((block) => block.status !== 'completed');

  function replaceBlock(updated: FocusBlock) {
    onFocusBlocksChange(focusBlocks.map((block) => (block.id === updated.id ? updated : block)));
  }

  async function scheduleFocusBlock(taskId: string) {
    setSavingTaskId(taskId);
    setError(null);

    const startsAt = new Date();
    const task = taskById.get(taskId);
    const durationMinutes = task?.estimated_minutes ?? DEFAULT_FOCUS_DURATION_MINUTES;
    const endsAt = new Date(startsAt.getTime() + durationMinutes * 60 * 1000);
    const { data, error: insertError } = await createClient()
      .from('focus_blocks')
      .insert({
        task_id: taskId,
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        status: 'active',
      })
      .select(
        'id, task_id, starts_at, ends_at, created_at, status, paused_at, remaining_seconds, completed_at'
      )
      .single();

    if (insertError || !data) {
      setError(
        'Không thể bắt đầu phiên tập trung. Hãy chạy daily-planning.sql trên Supabase rồi thử lại.'
      );
      setSavingTaskId(null);
      return;
    }

    onFocusBlocksChange([...focusBlocks, data as FocusBlock]);
    setSavingTaskId(null);
  }

  async function pauseFocusBlock(block: FocusBlock) {
    setUpdatingBlockId(block.id);
    setError(null);
    const remaining = remainingSeconds(block, new Date());
    const { data, error: updateError } = await createClient()
      .from('focus_blocks')
      .update({
        status: 'paused',
        paused_at: new Date().toISOString(),
        remaining_seconds: remaining,
      })
      .eq('id', block.id)
      .select(
        'id, task_id, starts_at, ends_at, created_at, status, paused_at, remaining_seconds, completed_at'
      )
      .single();

    if (updateError || !data) {
      setError('Không thể tạm dừng phiên tập trung. Vui lòng thử lại.');
    } else {
      replaceBlock(data as FocusBlock);
    }
    setUpdatingBlockId(null);
  }

  async function resumeFocusBlock(block: FocusBlock) {
    setUpdatingBlockId(block.id);
    setError(null);
    const startsAt = new Date();
    const remaining = block.remaining_seconds ?? DEFAULT_FOCUS_DURATION_MINUTES * 60;
    const endsAt = new Date(startsAt.getTime() + remaining * 1000);
    const { data, error: updateError } = await createClient()
      .from('focus_blocks')
      .update({
        status: 'active',
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        paused_at: null,
        remaining_seconds: null,
      })
      .eq('id', block.id)
      .select(
        'id, task_id, starts_at, ends_at, created_at, status, paused_at, remaining_seconds, completed_at'
      )
      .single();

    if (updateError || !data) {
      setError('Không thể tiếp tục phiên tập trung. Vui lòng thử lại.');
    } else {
      replaceBlock(data as FocusBlock);
    }
    setUpdatingBlockId(null);
  }

  async function completeFocusBlock(block: FocusBlock) {
    setUpdatingBlockId(block.id);
    setError(null);
    const completedAt = new Date().toISOString();
    const { data, error: updateError } = await createClient()
      .from('focus_blocks')
      .update({ status: 'completed', completed_at: completedAt })
      .eq('id', block.id)
      .select(
        'id, task_id, starts_at, ends_at, created_at, status, paused_at, remaining_seconds, completed_at'
      )
      .single();

    if (updateError || !data) {
      setError('Không thể hoàn tất phiên tập trung. Vui lòng thử lại.');
    } else {
      replaceBlock(data as FocusBlock);
    }
    setUpdatingBlockId(null);
  }

  async function removeFocusBlock(blockId: string) {
    setUpdatingBlockId(blockId);
    setError(null);
    const { error: deleteError } = await createClient()
      .from('focus_blocks')
      .delete()
      .eq('id', blockId);

    if (deleteError) {
      setError('Không thể hủy phiên tập trung. Vui lòng thử lại.');
    } else {
      onFocusBlocksChange(focusBlocks.filter((block) => block.id !== blockId));
    }
    setUpdatingBlockId(null);
  }

  return (
    <div className="space-y-5">
      <section className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Planner tập trung</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Chọn một việc để tạo phiên tập trung. Thời lượng mặc định là 25 phút hoặc lấy từ ước
              tính của việc đó.
            </p>
          </div>
          <span className="badge-primary px-3 py-1.5 font-semibold">
            <Clock3 className="size-3.5" /> {DEFAULT_FOCUS_DURATION_MINUTES} phút
          </span>
        </div>

        {activeBlock && (
          <div className="border-primary/30 bg-primary/10 mt-5 rounded-lg border p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                  Đang tập trung
                </p>
                <button
                  type="button"
                  className="mt-1 text-left text-sm font-semibold text-foreground hover:text-primary"
                  onClick={() => onTaskClick(activeBlock.task_id)}
                >
                  {taskById.get(activeBlock.task_id)?.title ?? 'Công việc đã bị xóa'}
                </button>
              </div>
              <p
                className="text-3xl font-semibold tracking-tight text-foreground"
                aria-live="polite"
              >
                {formatCountdown(remainingSeconds(activeBlock, now))}
              </p>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={updatingBlockId === activeBlock.id}
                onClick={() => pauseFocusBlock(activeBlock)}
                className="btn-outline h-9 px-3 text-sm"
              >
                <Pause className="h-4 w-4" aria-hidden="true" /> Tạm dừng
              </button>
              <button
                type="button"
                disabled={updatingBlockId === activeBlock.id}
                onClick={() => completeFocusBlock(activeBlock)}
                className="btn-primary h-9 px-3 text-sm"
              >
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Hoàn tất phiên
              </button>
            </div>
          </div>
        )}

        {error && (
          <p className="bg-danger/10 mt-4 rounded-lg border border-danger px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}

        <div className="mt-5 border-t border-border pt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Phiên đã lên lịch
          </p>
          {visibleBlocks.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">
              Chưa có phiên tập trung nào. Chọn một công việc bên dưới để bắt đầu.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {visibleBlocks.map((block) => {
                const task = taskById.get(block.task_id);
                const isPaused = block.status === 'paused';
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
                        {isPaused
                          ? `Đang tạm dừng, còn ${formatCountdown(block.remaining_seconds ?? 0)}`
                          : `${formatFocusTime(block.starts_at)} – ${new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit' }).format(new Date(block.ends_at))}`}
                      </p>
                    </button>
                    <div className="flex shrink-0 items-center gap-1">
                      {isPaused && (
                        <button
                          type="button"
                          aria-label="Tiếp tục phiên tập trung"
                          title="Tiếp tục"
                          disabled={updatingBlockId === block.id}
                          onClick={() => resumeFocusBlock(block)}
                          className="hover:bg-primary/10 rounded-lg p-2 text-primary transition-colors disabled:opacity-50"
                        >
                          <Play className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        aria-label="Hủy phiên tập trung"
                        title="Hủy phiên"
                        disabled={updatingBlockId === block.id}
                        onClick={() => removeFocusBlock(block.id)}
                        className="hover:bg-danger/10 rounded-lg p-2 text-muted-foreground transition-colors hover:text-danger disabled:opacity-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
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
                      ? 'Đang bắt đầu…'
                      : `Bắt đầu ${task.estimated_minutes ?? DEFAULT_FOCUS_DURATION_MINUTES} phút`}
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
