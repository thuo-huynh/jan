'use client';

import { useState, type FormEvent } from 'react';
import { createClient } from '@/shared/supabase/client';
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
      setError(dbError?.message ?? 'Failed to save entry');
      return;
    }

    setLogs((prev) => [data as ListeningLog, ...prev]);
    setSource('');
    setDurationMin('');
    setComprehensionScore('');
    setNotes('');
  }

  return (
    <div className="space-y-4">
      <form
        onSubmit={handleSubmit}
        className="space-y-3 rounded-lg border border-border bg-card p-4"
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground" htmlFor="listening-source">
              Source
            </label>
            <input
              id="listening-source"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="e.g. NHK Easy News podcast"
              required
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground" htmlFor="listening-duration">
              Duration (min)
            </label>
            <input
              id="listening-duration"
              type="number"
              min={0}
              value={durationMin}
              onChange={(e) => setDurationMin(e.target.value)}
              required
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary"
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-foreground" htmlFor="listening-score">
            Comprehension %
          </label>
          <input
            id="listening-score"
            type="number"
            min={0}
            max={100}
            value={comprehensionScore}
            onChange={(e) => setComprehensionScore(e.target.value)}
            className="w-32 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-foreground" htmlFor="listening-notes">
            Notes
          </label>
          <textarea
            id="listening-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary"
          />
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90 disabled:opacity-60"
        >
          {submitting ? 'Saving…' : 'Log session'}
        </button>
      </form>

      {logs.length === 0 ? (
        <p className="text-sm text-muted-foreground">No listening sessions logged yet.</p>
      ) : (
        <ul className="space-y-2">
          {logs.map((log) => (
            <li key={log.id} className="rounded-lg border border-border bg-card p-3">
              <p className="text-sm font-medium text-foreground">{log.source}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(log.practiced_at).toLocaleDateString()} · {log.duration_min} min
                {log.comprehension_score !== null && <> · {log.comprehension_score}% comprehension</>}
              </p>
              {log.notes && <p className="mt-1 text-sm text-muted-foreground">{log.notes}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
