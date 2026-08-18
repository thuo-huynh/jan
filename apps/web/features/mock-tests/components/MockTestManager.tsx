'use client';

import { useState, type FormEvent } from 'react';
import { createClient } from '@/shared/supabase/client';
import { mockTestResultSchema } from '@/shared/validation/schemas';
import type { MockTestResult } from '../types';

/**
 * Mock test score entry form (section scores + total + date) + history
 * table (T061), backing app/(app)/learn/mock-tests/page.tsx. Direct client
 * -> Supabase under RLS (mock_test_results_insert_own, 0011_rls_owner_scoped.sql).
 */
interface MockTestManagerProps {
  initialResults: MockTestResult[];
}

function toNumberOrNull(value: string): number | null {
  return value === '' ? null : Number(value);
}

export function MockTestManager({ initialResults }: MockTestManagerProps) {
  const [results, setResults] = useState(initialResults);
  const [testDate, setTestDate] = useState(new Date().toISOString().slice(0, 10));
  const [vocabGrammar, setVocabGrammar] = useState('');
  const [reading, setReading] = useState('');
  const [listening, setListening] = useState('');
  const [total, setTotal] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // If the total is left blank but at least one section score was entered,
  // auto-sum the sections instead of making the user do the arithmetic —
  // matches how most JLPT practice-book answer keys report a combined score.
  const autoTotal =
    total === '' && (vocabGrammar !== '' || reading !== '' || listening !== '')
      ? [vocabGrammar, reading, listening].reduce((sum, v) => sum + (v === '' ? 0 : Number(v)), 0)
      : null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const parsed = mockTestResultSchema.safeParse({
      testDate,
      vocabGrammarScore: toNumberOrNull(vocabGrammar),
      readingScore: toNumberOrNull(reading),
      listeningScore: toNumberOrNull(listening),
      totalScore: total === '' ? autoTotal : toNumberOrNull(total),
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
      .from('mock_test_results')
      .insert({
        user_id: user.id,
        test_date: parsed.data.testDate,
        vocab_grammar_score: parsed.data.vocabGrammarScore,
        reading_score: parsed.data.readingScore,
        listening_score: parsed.data.listeningScore,
        total_score: parsed.data.totalScore,
      })
      .select('*')
      .single();

    setSubmitting(false);

    if (dbError || !data) {
      setError(dbError?.message ?? 'Failed to save result');
      return;
    }

    setResults((prev) =>
      [...prev, data as MockTestResult].sort((a, b) => a.test_date.localeCompare(b.test_date)),
    );
    setVocabGrammar('');
    setReading('');
    setListening('');
    setTotal('');
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="card space-y-3 p-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <div>
            <label className="label-field" htmlFor="mt-date">
              Test date
            </label>
            <input
              id="mt-date"
              type="date"
              value={testDate}
              onChange={(e) => setTestDate(e.target.value)}
              required
              className="input-field"
            />
          </div>
          <div>
            <label className="label-field" htmlFor="mt-vg">
              文字・語彙・文法
            </label>
            <input
              id="mt-vg"
              type="number"
              min={0}
              value={vocabGrammar}
              onChange={(e) => setVocabGrammar(e.target.value)}
              className="input-field"
            />
          </div>
          <div>
            <label className="label-field" htmlFor="mt-reading">
              読解
            </label>
            <input
              id="mt-reading"
              type="number"
              min={0}
              value={reading}
              onChange={(e) => setReading(e.target.value)}
              className="input-field"
            />
          </div>
          <div>
            <label className="label-field" htmlFor="mt-listening">
              聴解
            </label>
            <input
              id="mt-listening"
              type="number"
              min={0}
              value={listening}
              onChange={(e) => setListening(e.target.value)}
              className="input-field"
            />
          </div>
          <div>
            <label className="label-field" htmlFor="mt-total">
              Total
            </label>
            <input
              id="mt-total"
              type="number"
              min={0}
              value={total}
              onChange={(e) => setTotal(e.target.value)}
              placeholder={autoTotal !== null ? String(autoTotal) : undefined}
              className="input-field"
            />
          </div>
        </div>
        {autoTotal !== null && (
          <p className="helper-text">Leave Total blank to auto-sum the sections above ({autoTotal}).</p>
        )}

        {error && <p className="error-text">{error}</p>}

        <button type="submit" disabled={submitting} className="btn-primary">
          {submitting ? 'Saving…' : 'Save result'}
        </button>
      </form>

      {results.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">No mock test results recorded yet.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Date</th>
                <th className="px-3 py-2 font-medium">文字・語彙・文法</th>
                <th className="px-3 py-2 font-medium">読解</th>
                <th className="px-3 py-2 font-medium">聴解</th>
                <th className="px-3 py-2 font-medium">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[...results]
                .sort((a, b) => b.test_date.localeCompare(a.test_date))
                .map((r) => (
                  <tr key={r.id} className="bg-card">
                    <td className="px-3 py-2 text-foreground">
                      {new Date(r.test_date).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-2 text-foreground">{r.vocab_grammar_score ?? '—'}</td>
                    <td className="px-3 py-2 text-foreground">{r.reading_score ?? '—'}</td>
                    <td className="px-3 py-2 text-foreground">{r.listening_score ?? '—'}</td>
                    <td className="px-3 py-2 font-medium text-foreground">{r.total_score ?? '—'}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
