'use client';

import { useState, type FormEvent } from 'react';
import { Trash2 } from 'lucide-react';
import { createClient } from '@/shared/supabase/client';
import { useConfirm } from '@/shared/hooks/useConfirm';
import { readingLogSchema } from '@/shared/validation/schemas';
import { AttachToSrsButton } from './AttachToSrsButton';
import { PASSAGE_TYPES, type ReadingLog } from '../types';

/**
 * Reading log entry form + history table (T057), backing
 * app/(app)/learn/reading/page.tsx. Direct client -> Supabase under RLS
 * (reading_logs_insert_own, 0011_rls_owner_scoped.sql), same architecture as
 * the other feature managers (CustomVocabManager, NoteEditor).
 */
interface ReadingLogManagerProps {
  initialLogs: ReadingLog[];
}

export function ReadingLogManager({ initialLogs }: ReadingLogManagerProps) {
  const [logs, setLogs] = useState(initialLogs);
  const [source, setSource] = useState('');
  const [passageType, setPassageType] = useState('');
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

    const parsed = readingLogSchema.safeParse({
      source,
      passageType: passageType || null,
      durationMin: Number(durationMin),
      comprehensionScore: comprehensionScore === '' ? null : Number(comprehensionScore),
      notes: notes || null,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Invalid entry');
      return;
    }

    setSubmitting(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSubmitting(false);
      setError('You must be signed in.');
      return;
    }

    const { data, error: dbError } = await supabase
      .from('reading_logs')
      .insert({
        user_id: user.id,
        source: parsed.data.source,
        passage_type: parsed.data.passageType,
        duration_min: parsed.data.durationMin,
        comprehension_score: parsed.data.comprehensionScore,
        notes: parsed.data.notes,
      })
      .select('*')
      .single();

    setSubmitting(false);

    if (dbError || !data) {
      setError(dbError?.message ?? 'Failed to save entry');
      return;
    }

    setLogs((prev) => [data as ReadingLog, ...prev]);
    setSource('');
    setPassageType('');
    setDurationMin('');
    setComprehensionScore('');
    setNotes('');
  }

  async function handleDelete(id: string) {
    const ok = await confirm({
      title: 'Delete this reading session?',
      description: 'This cannot be undone.',
    });
    if (!ok) return;
    setDeleteError(null);
    setDeletingId(id);
    const supabase = createClient();
    const { error: dbError } = await supabase.from('reading_logs').delete().eq('id', id);
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
            <label className="label-field" htmlFor="reading-source">
              Source
            </label>
            <input
              id="reading-source"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="e.g. N2 practice book, ch. 3"
              required
              className="input-field"
            />
          </div>
          <div>
            <label className="label-field" htmlFor="reading-passage-type">
              Passage type
            </label>
            <input
              id="reading-passage-type"
              value={passageType}
              onChange={(e) => setPassageType(e.target.value)}
              list="passage-type-options"
              placeholder="随筆 / 評論 / 案内…"
              className="input-field font-jp"
            />
            <datalist id="passage-type-options">
              {PASSAGE_TYPES.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div>
            <label className="label-field" htmlFor="reading-duration">
              Duration (min)
            </label>
            <input
              id="reading-duration"
              type="number"
              min={0}
              value={durationMin}
              onChange={(e) => setDurationMin(e.target.value)}
              required
              className="input-field"
            />
          </div>
          <div>
            <label className="label-field" htmlFor="reading-score">
              Comprehension %
            </label>
            <input
              id="reading-score"
              type="number"
              min={0}
              max={100}
              value={comprehensionScore}
              onChange={(e) => setComprehensionScore(e.target.value)}
              className="input-field"
            />
          </div>
        </div>
        <div>
          <label className="label-field" htmlFor="reading-notes">
            Notes
          </label>
          <textarea
            id="reading-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="textarea-field"
          />
        </div>

        {error && <p className="error-text">{error}</p>}

        <button type="submit" disabled={submitting} className="btn-primary">
          {submitting ? 'Saving…' : 'Log session'}
        </button>
      </form>

      {deleteError && <p className="error-text">{deleteError}</p>}

      {logs.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">No reading sessions logged yet.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {logs.map((log) => (
            <li key={log.id} className="card p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-foreground">{log.source}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(log.practiced_at).toLocaleDateString()} · {log.duration_min} min
                    {log.passage_type && <span className="font-jp"> · {log.passage_type}</span>}
                    {log.comprehension_score !== null && <> · {log.comprehension_score}% comprehension</>}
                  </p>
                  {log.notes && <p className="mt-1 text-sm text-muted-foreground">{log.notes}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(log.id)}
                  disabled={deletingId === log.id}
                  aria-label={`Delete reading session: ${log.source}`}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-danger/10 hover:text-danger disabled:opacity-40"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
              <div className="mt-2">
                <AttachToSrsButton readingLogId={log.id} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
