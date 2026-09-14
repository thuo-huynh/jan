'use client';

import { useState } from 'react';
import { CheckCircle2, Send } from 'lucide-react';
import { createClient } from '@/shared/supabase/client';
import type { DailyReview, TodayTask } from '../lib/home';

interface DailyReviewCardProps {
  date: string;
  tasks: TodayTask[];
  initialReview: DailyReview | null;
}

/** A deliberately short end-of-day check-in that records one chosen next action. */
export function DailyReviewCard({ date, tasks, initialReview }: DailyReviewCardProps) {
  const [note, setNote] = useState(initialReview?.note ?? '');
  const [tomorrowTaskId, setTomorrowTaskId] = useState(initialReview?.tomorrowTaskId ?? '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function saveReview() {
    setSaving(true);
    setMessage(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setMessage('Bạn cần đăng nhập để lưu review.');
      setSaving(false);
      return;
    }

    const { error } = await supabase.from('daily_reviews').upsert(
      {
        user_id: user.id,
        review_date: date,
        note: note.trim(),
        tomorrow_task_id: tomorrowTaskId || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,review_date' }
    );
    setSaving(false);
    setMessage(error ? 'Không thể lưu review. Vui lòng thử lại.' : 'Đã lưu kế hoạch cho ngày mai.');
  }

  return (
    <section className="skill-card p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            Khép lại ngày hôm nay
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Ghi một dòng, rồi chọn việc đầu tiên cho ngày mai.
          </p>
        </div>
        <CheckCircle2 className="h-5 w-5 shrink-0 text-success" aria-hidden="true" />
      </div>
      <label htmlFor="daily-review-note" className="label-field mt-5 text-xs">
        Điều gì đã tiến triển?
      </label>
      <textarea
        id="daily-review-note"
        value={note}
        onChange={(event) => setNote(event.target.value)}
        maxLength={1000}
        rows={3}
        placeholder="Ví dụ: Đã ôn 20 từ N2 và hoàn thành bài đọc."
        className="textarea-field min-h-0 resize-none"
      />
      <label htmlFor="tomorrow-task" className="label-field mt-4 text-xs">
        Việc đầu tiên ngày mai
      </label>
      <select
        id="tomorrow-task"
        value={tomorrowTaskId}
        onChange={(event) => setTomorrowTaskId(event.target.value)}
        className="input-field h-10"
      >
        <option value="">Chưa chọn</option>
        {tasks.map((task) => (
          <option key={task.id} value={task.id}>
            {task.title}
          </option>
        ))}
      </select>
      {message && (
        <p className={message.startsWith('Đã') ? 'helper-text text-success' : 'error-text'}>
          {message}
        </p>
      )}
      <button
        type="button"
        onClick={saveReview}
        disabled={saving}
        className="btn-primary mt-4 h-10 w-full justify-center"
      >
        <Send className="h-4 w-4" aria-hidden="true" /> {saving ? 'Đang lưu…' : 'Lưu review'}
      </button>
    </section>
  );
}
