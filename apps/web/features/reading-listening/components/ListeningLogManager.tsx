'use client';

import { useState, type FormEvent } from 'react';
import { Trash2 } from 'lucide-react';
import { createClient } from '@/shared/supabase/client';
import { useConfirm } from '@/shared/hooks/useConfirm';
import { listeningLogSchema } from '@/shared/validation/schemas';
import type { ListeningLog } from '../types';

/**
 * Listening log entry form + history table (T058), backing
 * app/(app)/learn/listening/page.tsx. Mirrors ReadingLogManager.tsx minus
 * passage_type and the attach-to-SRS action, which acceptance scenario 2
 * (spec.md US4) ties specifically to reading logs.
 */
interface ListeningLogManagerProps {
  initialLogs: ListeningLog[];
}

export function ListeningLogManager({ initialLogs }: ListeningLogManagerProps) {
  const [logs, setLogs] = useState(initialLogs);
  const [source, setSource] = useState('');
  const [durationMin, setDurationMin] = useState('');
  const [comprehensionScore, setComprehensionScore] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const { confirm, confirmDialog } = useConfirm();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const parsed = listeningLogSchema.safeParse({
      source,
      durationMin: Number(durationMin),
      comprehensionScore: comprehensionScore === '' ? null : Number(comprehensionScore),
      notes: notes || null,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Mục không hợp lệ');
      return;
    }

    setSubmitting(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSubmitting(false);
      setError('Bạn cần đăng nhập.');
      return;
    }

    const { data, error: dbError } = await supabase
      .from('listening_logs')
      .insert({
        user_id: user.id,
        source: parsed.data.source,
        duration_min: parsed.data.durationMin,
        comprehension_score: parsed.data.comprehensionScore,
        notes: parsed.data.notes,
      })
      .select('*')
      .single();

    setSubmitting(false);

    if (dbError || !data) {
      setError(dbError?.message ?? 'Lưu thất bại');
      return;
    }

    setLogs((prev) => [data as ListeningLog, ...prev]);
    setSource('');
    setDurationMin('');
    setComprehensionScore('');
    setNotes('');
  }

  async function handleDelete(id: string) {
    const ok = await confirm({
      title: 'Xóa buổi nghe này?',
      description: 'Không thể hoàn tác thao tác này.',
    });
    if (!ok) return;
    setDeleteError(null);
    setDeletingId(id);
    const supabase = createClient();
    const { error: dbError } = await supabase.from('listening_logs').delete().eq('id', id);
    setDeletingId(null);
    if (dbError) {
      setDeleteError(dbError.message);
      return;
    }
    setLogs((prev) => prev.filter((l) => l.id !== id));
  }

  return (
    <div className="space-y-4">
      {confirmDialog}
      <form onSubmit={handleSubmit} className="card space-y-3 p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="label-field" htmlFor="listening-source">
              Nguồn
            </label>
            <input
              id="listening-source"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="vd: Podcast NHK Easy News"
              required
              className="input-field"
            />
          </div>
          <div>
            <label className="label-field" htmlFor="listening-duration">
              Thời gian (phút)
            </label>
            <input
              id="listening-duration"
              type="number"
              min={0}
              value={durationMin}
              onChange={(e) => setDurationMin(e.target.value)}
              required
              className="input-field"
            />
          </div>
        </div>
        <div>
          <label className="label-field" htmlFor="listening-score">
            Độ hiểu bài (%)
          </label>
          <input
            id="listening-score"
            type="number"
            min={0}
            max={100}
            value={comprehensionScore}
            onChange={(e) => setComprehensionScore(e.target.value)}
            className="input-field w-32"
          />
        </div>
        <div>
          <label className="label-field" htmlFor="listening-notes">
            Ghi chú
          </label>
          <textarea
            id="listening-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="textarea-field"
          />
        </div>

        {error && <p className="error-text">{error}</p>}

        <button type="submit" disabled={submitting} className="btn-primary">
          {submitting ? 'Đang lưu…' : 'Ghi lại buổi học'}
        </button>
      </form>

      {deleteError && <p className="error-text">{deleteError}</p>}

      {logs.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">Chưa có buổi nghe nào được ghi lại.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {logs.map((log) => (
            <li key={log.id} className="card p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-foreground">{log.source}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(log.practiced_at).toLocaleDateString('vi-VN')} · {log.duration_min} phút
                    {log.comprehension_score !== null && <> · hiểu {log.comprehension_score}%</>}
                  </p>
                  {log.notes && <p className="mt-1 text-sm text-muted-foreground">{log.notes}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(log.id)}
                  disabled={deletingId === log.id}
                  aria-label={`Xóa buổi nghe: ${log.source}`}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-danger/10 hover:text-danger disabled:opacity-40"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
