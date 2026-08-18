'use client';

import { useCallback, useEffect, useState } from 'react';
import { BookMarked, GitCompare, Palette, Pencil, PackageOpen, Trash2 } from 'lucide-react';

function EmptyTableState({ icon: Icon, message }: { icon: typeof PackageOpen; message: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-6 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
        <Icon className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
      </div>
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

const REFERENCE_PAGE_SIZE = 50;

/**
 * Previous/Next pager matching AdminUsersPage/AdminContentPage's pattern
 * (app/admin/users/page.tsx, app/admin/content/page.tsx). The reference-data
 * routes already paginate server-side at 50 rows/page (see PAGE_SIZE in
 * app/api/admin/reference-data/{vocab,grammar,confusable-pairs}/route.ts)
 * but until this, none of these tabs sent a `page` param or exposed a way to
 * reach it — at the catalog's real scale (hundreds of vocab/grammar rows)
 * everything past row 50 was silently unreachable.
 */
function PaginationBar({
  page,
  total,
  itemLabel,
  onPageChange,
}: {
  page: number;
  total: number;
  itemLabel: string;
  onPageChange: (page: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / REFERENCE_PAGE_SIZE));
  return (
    <div className="flex items-center justify-between text-sm text-muted-foreground">
      <span>
        Page {page} of {totalPages} ({total} {itemLabel})
      </span>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(Math.max(1, page - 1))}
          className="btn-outline h-8 px-3 text-xs disabled:opacity-40"
        >
          Previous
        </button>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          className="btn-outline h-8 px-3 text-xs disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}

/**
 * T096 — Admin reference-data management page (vocab/grammar/confusable
 * pairs CRUD UI). Calls T090 (`/api/admin/reference-data/vocab`), T091
 * (`/api/admin/reference-data/grammar`), T092
 * (`/api/admin/reference-data/confusable-pairs`) — full CRUD on the global
 * (`user_id IS NULL`) catalog rows, per FR-017/FR-012/FR-015/FR-048.
 */

const inputClass = 'input-field';
const labelClass = 'label-field';
const primaryButtonClass = 'btn-primary';
const secondaryButtonClass = 'btn-outline';
// Dense variants for table row actions (Edit/Delete), which need to stay
// compact inside a data-dense admin table row rather than the default h-10.
const rowButtonClass = 'btn-outline h-8 px-3 text-xs';
const dangerButtonClass = 'btn-outline h-8 border-danger/40 px-3 text-xs text-danger hover:bg-danger/10';

type Tab = 'vocab' | 'grammar' | 'pairs' | 'themes';

const TABS: { value: Tab; label: string }[] = [
  { value: 'vocab', label: 'Vocab & Kanji' },
  { value: 'grammar', label: 'Grammar Points' },
  { value: 'pairs', label: 'Confusable Pairs' },
  { value: 'themes', label: 'Themes' },
];

export default function AdminReferenceDataPage() {
  const [tab, setTab] = useState<Tab>('vocab');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Reference data
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Manage the shared/global N2 vocab, kanji, grammar points, and confusable pairs (FR-048)
          — independent of any user&apos;s own custom entries or personal notes.
        </p>
      </div>

      <div className="flex gap-2">
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setTab(t.value)}
            className={
              t.value === tab
                ? 'rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground'
                : 'rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted'
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'vocab' && <VocabTab />}
      {tab === 'grammar' && <GrammarTab />}
      {tab === 'pairs' && <PairsTab />}
      {tab === 'themes' && <ThemesTab />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Vocab / Kanji tab
// ---------------------------------------------------------------------------

type VocabEntry = {
  id: string;
  word: string;
  reading: string | null;
  meaning: string;
  example: string | null;
  jlpt_level: string | null;
  is_kanji: boolean;
};

const emptyVocabForm = {
  id: null as string | null,
  word: '',
  reading: '',
  meaning: '',
  example: '',
  jlptLevel: 'N2',
  isKanji: false,
};

function VocabTab() {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<VocabEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyVocabForm);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (query.trim()) params.set('query', query.trim());
      const res = await fetch(`/api/admin/reference-data/vocab?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed to load vocab');
      setItems(json.items);
      setTotal(json.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load vocab');
    } finally {
      setLoading(false);
    }
  }, [query, page]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSubmit() {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        word: form.word.trim(),
        reading: form.reading.trim() || null,
        meaning: form.meaning.trim(),
        example: form.example.trim() || null,
        jlptLevel: form.jlptLevel.trim() || 'N2',
        isKanji: form.isKanji,
      };
      const res = await fetch('/api/admin/reference-data/vocab', {
        method: form.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form.id ? { id: form.id, ...payload } : payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.formErrors?.[0] ?? json.error ?? 'Save failed');
      setForm(emptyVocabForm);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this global vocab/kanji entry?')) return;
    setError(null);
    try {
      const res = await fetch(`/api/admin/reference-data/vocab?id=${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Delete failed');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="text-sm font-semibold text-foreground">
          {form.id ? 'Edit entry' : 'Add new entry'}
        </h2>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Word</label>
            <input
              className={inputClass}
              value={form.word}
              onChange={(e) => setForm((f) => ({ ...f, word: e.target.value }))}
            />
          </div>
          <div>
            <label className={labelClass}>Reading</label>
            <input
              className={inputClass}
              value={form.reading}
              onChange={(e) => setForm((f) => ({ ...f, reading: e.target.value }))}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Meaning</label>
            <input
              className={inputClass}
              value={form.meaning}
              onChange={(e) => setForm((f) => ({ ...f, meaning: e.target.value }))}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Example</label>
            <input
              className={inputClass}
              value={form.example}
              onChange={(e) => setForm((f) => ({ ...f, example: e.target.value }))}
            />
          </div>
          <div>
            <label className={labelClass}>JLPT level</label>
            <input
              className={inputClass}
              value={form.jlptLevel}
              onChange={(e) => setForm((f) => ({ ...f, jlptLevel: e.target.value }))}
            />
          </div>
          <div className="flex items-end gap-2">
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={form.isKanji}
                onChange={(e) => setForm((f) => ({ ...f, isKanji: e.target.checked }))}
                className="h-4 w-4 rounded border-border accent-primary"
              />
              Is kanji
            </label>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            disabled={saving || !form.word.trim() || !form.meaning.trim()}
            onClick={handleSubmit}
            className={primaryButtonClass}
          >
            {form.id ? 'Save changes' : 'Add entry'}
          </button>
          {form.id && (
            <button type="button" onClick={() => setForm(emptyVocabForm)} className={secondaryButtonClass}>
              Cancel
            </button>
          )}
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          load();
        }}
        className="flex gap-2"
      >
        <input
          className={`${inputClass} max-w-sm`}
          placeholder="Search word/meaning…"
          value={query}
          onChange={(e) => {
            setPage(1);
            setQuery(e.target.value);
          }}
        />
        <button type="submit" className={secondaryButtonClass}>
          Search
        </button>
      </form>

      {error && (
        <div className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-2 text-sm text-danger">
          {error}
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Word</th>
              <th className="px-4 py-3">Reading</th>
              <th className="px-4 py-3">Meaning</th>
              <th className="px-4 py-3">Kanji</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                  Loading…
                </td>
              </tr>
            )}
            {!loading && items.length === 0 && (
              <tr>
                <td colSpan={5}>
                  <EmptyTableState icon={PackageOpen} message="No entries found." />
                </td>
              </tr>
            )}
            {!loading &&
              items.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3 font-jp text-foreground">{item.word}</td>
                  <td className="px-4 py-3 font-jp text-muted-foreground">{item.reading}</td>
                  <td className="px-4 py-3 text-muted-foreground">{item.meaning}</td>
                  <td className="px-4 py-3 text-muted-foreground">{item.is_kanji ? 'Yes' : 'No'}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        className={rowButtonClass}
                        onClick={() =>
                          setForm({
                            id: item.id,
                            word: item.word,
                            reading: item.reading ?? '',
                            meaning: item.meaning,
                            example: item.example ?? '',
                            jlptLevel: item.jlpt_level ?? 'N2',
                            isKanji: item.is_kanji,
                          })
                        }
                      >
                        <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                        Edit
                      </button>
                      <button type="button" className={dangerButtonClass} onClick={() => handleDelete(item.id)}>
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      <PaginationBar page={page} total={total} itemLabel="global entries" onPageChange={setPage} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Grammar points tab
// ---------------------------------------------------------------------------

type GrammarPoint = {
  id: string;
  pattern: string;
  meaning: string;
  connection_form: string | null;
  formality_nuance: string | null;
  example_sentences: string[];
  jlpt_level: string;
  frequency_tag: string | null;
  n3_overlap: boolean;
};

const emptyGrammarForm = {
  id: null as string | null,
  pattern: '',
  meaning: '',
  connectionForm: '',
  formalityNuance: '',
  exampleSentences: '',
  jlptLevel: 'N2',
  frequencyTag: '',
  n3Overlap: false,
};

function GrammarTab() {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<GrammarPoint[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyGrammarForm);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (query.trim()) params.set('query', query.trim());
      const res = await fetch(`/api/admin/reference-data/grammar?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed to load grammar points');
      setItems(json.items);
      setTotal(json.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load grammar points');
    } finally {
      setLoading(false);
    }
  }, [query, page]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSubmit() {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        pattern: form.pattern.trim(),
        meaning: form.meaning.trim(),
        connectionForm: form.connectionForm.trim() || null,
        formalityNuance: form.formalityNuance.trim() || null,
        exampleSentences: form.exampleSentences
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean),
        jlptLevel: form.jlptLevel.trim() || 'N2',
        frequencyTag: form.frequencyTag.trim() || null,
        n3Overlap: form.n3Overlap,
      };
      const res = await fetch('/api/admin/reference-data/grammar', {
        method: form.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form.id ? { id: form.id, ...payload } : payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.formErrors?.[0] ?? json.error ?? 'Save failed');
      setForm(emptyGrammarForm);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this global grammar point? Any confusable pairs referencing it will also break.')) return;
    setError(null);
    try {
      const res = await fetch(`/api/admin/reference-data/grammar?id=${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Delete failed');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="text-sm font-semibold text-foreground">
          {form.id ? 'Edit grammar point' : 'Add new grammar point'}
        </h2>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Pattern (文型)</label>
            <input
              className={inputClass}
              value={form.pattern}
              onChange={(e) => setForm((f) => ({ ...f, pattern: e.target.value }))}
            />
          </div>
          <div>
            <label className={labelClass}>Connection form (接続)</label>
            <input
              className={inputClass}
              value={form.connectionForm}
              onChange={(e) => setForm((f) => ({ ...f, connectionForm: e.target.value }))}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Meaning</label>
            <input
              className={inputClass}
              value={form.meaning}
              onChange={(e) => setForm((f) => ({ ...f, meaning: e.target.value }))}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Formality / nuance</label>
            <input
              className={inputClass}
              value={form.formalityNuance}
              onChange={(e) => setForm((f) => ({ ...f, formalityNuance: e.target.value }))}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Example sentences (one per line)</label>
            <textarea
              className="textarea-field"
              rows={3}
              value={form.exampleSentences}
              onChange={(e) => setForm((f) => ({ ...f, exampleSentences: e.target.value }))}
            />
          </div>
          <div>
            <label className={labelClass}>JLPT level</label>
            <input
              className={inputClass}
              value={form.jlptLevel}
              onChange={(e) => setForm((f) => ({ ...f, jlptLevel: e.target.value }))}
            />
          </div>
          <div>
            <label className={labelClass}>Frequency tag</label>
            <input
              className={inputClass}
              placeholder="high / medium / low"
              value={form.frequencyTag}
              onChange={(e) => setForm((f) => ({ ...f, frequencyTag: e.target.value }))}
            />
          </div>
          <div className="flex items-end gap-2">
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={form.n3Overlap}
                onChange={(e) => setForm((f) => ({ ...f, n3Overlap: e.target.checked }))}
                className="h-4 w-4 rounded border-border accent-primary"
              />
              N3 overlap
            </label>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            disabled={saving || !form.pattern.trim() || !form.meaning.trim()}
            onClick={handleSubmit}
            className={primaryButtonClass}
          >
            {form.id ? 'Save changes' : 'Add grammar point'}
          </button>
          {form.id && (
            <button type="button" onClick={() => setForm(emptyGrammarForm)} className={secondaryButtonClass}>
              Cancel
            </button>
          )}
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          load();
        }}
        className="flex gap-2"
      >
        <input
          className={`${inputClass} max-w-sm`}
          placeholder="Search pattern/meaning…"
          value={query}
          onChange={(e) => {
            setPage(1);
            setQuery(e.target.value);
          }}
        />
        <button type="submit" className={secondaryButtonClass}>
          Search
        </button>
      </form>

      {error && (
        <div className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-2 text-sm text-danger">
          {error}
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Pattern</th>
              <th className="px-4 py-3">Meaning</th>
              <th className="px-4 py-3">Frequency</th>
              <th className="px-4 py-3">N3 overlap</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                  Loading…
                </td>
              </tr>
            )}
            {!loading && items.length === 0 && (
              <tr>
                <td colSpan={5}>
                  <EmptyTableState icon={BookMarked} message="No grammar points found." />
                </td>
              </tr>
            )}
            {!loading &&
              items.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3 font-jp text-foreground">{item.pattern}</td>
                  <td className="px-4 py-3 text-muted-foreground">{item.meaning}</td>
                  <td className="px-4 py-3 text-muted-foreground">{item.frequency_tag ?? '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{item.n3_overlap ? 'Yes' : 'No'}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        className={rowButtonClass}
                        onClick={() =>
                          setForm({
                            id: item.id,
                            pattern: item.pattern,
                            meaning: item.meaning,
                            connectionForm: item.connection_form ?? '',
                            formalityNuance: item.formality_nuance ?? '',
                            exampleSentences: (item.example_sentences ?? []).join('\n'),
                            jlptLevel: item.jlpt_level ?? 'N2',
                            frequencyTag: item.frequency_tag ?? '',
                            n3Overlap: item.n3_overlap,
                          })
                        }
                      >
                        <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                        Edit
                      </button>
                      <button type="button" className={dangerButtonClass} onClick={() => handleDelete(item.id)}>
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      <PaginationBar page={page} total={total} itemLabel="grammar points" onPageChange={setPage} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Confusable pairs tab
// ---------------------------------------------------------------------------

type ConfusablePair = {
  id: string;
  grammarPointIdA: string;
  grammarPointIdB: string;
  pointA: { pattern: string; meaning: string } | null;
  pointB: { pattern: string; meaning: string } | null;
  comparisonNote: string;
};

type GrammarOption = { id: string; pattern: string };

const emptyPairForm = {
  id: null as string | null,
  grammarPointIdA: '',
  grammarPointIdB: '',
  comparisonNote: '',
};

async function fetchAllGrammarOptions(): Promise<GrammarOption[]> {
  const options: GrammarOption[] = [];
  for (let page = 1; page <= 6; page += 1) {
    const res = await fetch(`/api/admin/reference-data/grammar?page=${page}`);
    if (!res.ok) break;
    const json = await res.json();
    const batch = (json.items ?? []) as { id: string; pattern: string }[];
    options.push(...batch.map((g) => ({ id: g.id, pattern: g.pattern })));
    if (batch.length < 50) break;
  }
  return options;
}

function PairsTab() {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<ConfusablePair[]>([]);
  const [grammarOptions, setGrammarOptions] = useState<GrammarOption[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyPairForm);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (query.trim()) params.set('query', query.trim());
      const [pairsRes, options] = await Promise.all([
        fetch(`/api/admin/reference-data/confusable-pairs?${params.toString()}`),
        fetchAllGrammarOptions(),
      ]);
      const json = await pairsRes.json();
      if (!pairsRes.ok) throw new Error(json.error ?? 'Failed to load confusable pairs');
      setItems(json.items);
      setTotal(json.total);
      setGrammarOptions(options);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load confusable pairs');
    } finally {
      setLoading(false);
    }
  }, [query, page]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSubmit() {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        grammarPointIdA: form.grammarPointIdA,
        grammarPointIdB: form.grammarPointIdB,
        comparisonNote: form.comparisonNote.trim(),
      };
      const res = await fetch('/api/admin/reference-data/confusable-pairs', {
        method: form.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form.id ? { id: form.id, ...payload } : payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.formErrors?.[0] ?? json.error ?? 'Save failed');
      setForm(emptyPairForm);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this confusable-pair comparison?')) return;
    setError(null);
    try {
      const res = await fetch(`/api/admin/reference-data/confusable-pairs?id=${id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Delete failed');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="text-sm font-semibold text-foreground">
          {form.id ? 'Edit confusable pair' : 'Add new confusable pair'}
        </h2>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Grammar point A</label>
            <select
              className={inputClass}
              value={form.grammarPointIdA}
              onChange={(e) => setForm((f) => ({ ...f, grammarPointIdA: e.target.value }))}
            >
              <option value="">Select…</option>
              {grammarOptions.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.pattern}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Grammar point B</label>
            <select
              className={inputClass}
              value={form.grammarPointIdB}
              onChange={(e) => setForm((f) => ({ ...f, grammarPointIdB: e.target.value }))}
            >
              <option value="">Select…</option>
              {grammarOptions.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.pattern}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Comparison note</label>
            <textarea
              className="textarea-field"
              rows={4}
              value={form.comparisonNote}
              onChange={(e) => setForm((f) => ({ ...f, comparisonNote: e.target.value }))}
            />
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            disabled={
              saving ||
              !form.grammarPointIdA ||
              !form.grammarPointIdB ||
              form.grammarPointIdA === form.grammarPointIdB ||
              !form.comparisonNote.trim()
            }
            onClick={handleSubmit}
            className={primaryButtonClass}
          >
            {form.id ? 'Save changes' : 'Add pair'}
          </button>
          {form.id && (
            <button type="button" onClick={() => setForm(emptyPairForm)} className={secondaryButtonClass}>
              Cancel
            </button>
          )}
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          load();
        }}
        className="flex gap-2"
      >
        <input
          className={`${inputClass} max-w-sm`}
          placeholder="Search comparison note…"
          value={query}
          onChange={(e) => {
            setPage(1);
            setQuery(e.target.value);
          }}
        />
        <button type="submit" className={secondaryButtonClass}>
          Search
        </button>
      </form>

      {error && (
        <div className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-2 text-sm text-danger">
          {error}
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Pair</th>
              <th className="px-4 py-3">Comparison note</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-muted-foreground">
                  Loading…
                </td>
              </tr>
            )}
            {!loading && items.length === 0 && (
              <tr>
                <td colSpan={3}>
                  <EmptyTableState icon={GitCompare} message="No confusable pairs yet." />
                </td>
              </tr>
            )}
            {!loading &&
              items.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3 font-jp text-foreground">
                    {item.pointA?.pattern ?? '?'} vs {item.pointB?.pattern ?? '?'}
                  </td>
                  <td className="max-w-md truncate px-4 py-3 text-muted-foreground">
                    {item.comparisonNote}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        className={rowButtonClass}
                        onClick={() =>
                          setForm({
                            id: item.id,
                            grammarPointIdA: item.grammarPointIdA,
                            grammarPointIdB: item.grammarPointIdB,
                            comparisonNote: item.comparisonNote,
                          })
                        }
                      >
                        <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                        Edit
                      </button>
                      <button type="button" className={dangerButtonClass} onClick={() => handleDelete(item.id)}>
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      <PaginationBar page={page} total={total} itemLabel="confusable pairs" onPageChange={setPage} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Themes tab (T029-T031 — appearance system, US3)
//
// Deviation from tasks.md's file paths (ThemeAdminForm.tsx/ThemeAdminTable.tsx
// as separate feature components): every other tab on this page (Vocab,
// Grammar, Pairs) is a single self-contained function in this same file, not
// split into features/admin/components/* — matching that established
// in-file convention here instead of introducing a one-off different
// structure for just this tab. See report.
// ---------------------------------------------------------------------------

type ThemeRow = {
  id: string;
  slug: string;
  name: string;
  sort_order: number;
  primary_light: string;
  primary_foreground_light: string;
  secondary_light: string;
  secondary_foreground_light: string;
  accent_light: string;
  accent_foreground_light: string;
  primary_dark: string;
  primary_foreground_dark: string;
  secondary_dark: string;
  secondary_foreground_dark: string;
  accent_dark: string;
  accent_foreground_dark: string;
};

const emptyThemeForm = {
  id: null as string | null,
  slug: '',
  name: '',
  sortOrder: '0',
  primaryLight: '#0d9488',
  primaryForegroundLight: '#f0fdfa',
  secondaryLight: '#14b8a6',
  secondaryForegroundLight: '#f0fdfa',
  accentLight: '#f97316',
  accentForegroundLight: '#ffffff',
  primaryDark: '#2dd4bf',
  primaryForegroundDark: '#042f2e',
  secondaryDark: '#5eead4',
  secondaryForegroundDark: '#042f2e',
  accentDark: '#fb923c',
  accentForegroundDark: '#431407',
};

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className={labelClass}>{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={/^#[0-9a-fA-F]{6}$/.test(value) ? value : '#000000'}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-9 shrink-0 rounded border border-border bg-background p-0.5"
        />
        <input
          className={inputClass}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#000000"
        />
      </div>
    </div>
  );
}

function ThemesTab() {
  const [items, setItems] = useState<ThemeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyThemeForm);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/reference-data/themes');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed to load themes');
      setItems(json.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load themes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSubmit() {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        slug: form.slug.trim(),
        name: form.name.trim(),
        sortOrder: Number(form.sortOrder) || 0,
        primaryLight: form.primaryLight,
        primaryForegroundLight: form.primaryForegroundLight,
        secondaryLight: form.secondaryLight,
        secondaryForegroundLight: form.secondaryForegroundLight,
        accentLight: form.accentLight,
        accentForegroundLight: form.accentForegroundLight,
        primaryDark: form.primaryDark,
        primaryForegroundDark: form.primaryForegroundDark,
        secondaryDark: form.secondaryDark,
        secondaryForegroundDark: form.secondaryForegroundDark,
        accentDark: form.accentDark,
        accentForegroundDark: form.accentForegroundDark,
      };
      const res = await fetch('/api/admin/reference-data/themes', {
        method: form.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form.id ? { id: form.id, ...payload } : payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.formErrors?.[0] ?? json.error ?? 'Save failed');
      setForm(emptyThemeForm);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this theme? Users who have it selected will fall back to the default theme.'))
      return;
    setError(null);
    try {
      const res = await fetch(`/api/admin/reference-data/themes?id=${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Delete failed');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="text-sm font-semibold text-foreground">
          {form.id ? 'Edit theme' : 'Add new theme'}
        </h2>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label className={labelClass}>Name</label>
            <input
              className={inputClass}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div>
            <label className={labelClass}>Slug</label>
            <input
              className={inputClass}
              placeholder="lowercase-with-hyphens"
              value={form.slug}
              onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
            />
          </div>
          <div>
            <label className={labelClass}>Sort order</label>
            <input
              type="number"
              className={inputClass}
              value={form.sortOrder}
              onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))}
            />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Light mode
            </h3>
            <div className="space-y-3">
              <ColorField label="Primary" value={form.primaryLight} onChange={(v) => setForm((f) => ({ ...f, primaryLight: v }))} />
              <ColorField label="Primary foreground" value={form.primaryForegroundLight} onChange={(v) => setForm((f) => ({ ...f, primaryForegroundLight: v }))} />
              <ColorField label="Secondary" value={form.secondaryLight} onChange={(v) => setForm((f) => ({ ...f, secondaryLight: v }))} />
              <ColorField label="Secondary foreground" value={form.secondaryForegroundLight} onChange={(v) => setForm((f) => ({ ...f, secondaryForegroundLight: v }))} />
              <ColorField label="Accent" value={form.accentLight} onChange={(v) => setForm((f) => ({ ...f, accentLight: v }))} />
              <ColorField label="Accent foreground" value={form.accentForegroundLight} onChange={(v) => setForm((f) => ({ ...f, accentForegroundLight: v }))} />
            </div>
          </div>
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Dark mode
            </h3>
            <div className="space-y-3">
              <ColorField label="Primary" value={form.primaryDark} onChange={(v) => setForm((f) => ({ ...f, primaryDark: v }))} />
              <ColorField label="Primary foreground" value={form.primaryForegroundDark} onChange={(v) => setForm((f) => ({ ...f, primaryForegroundDark: v }))} />
              <ColorField label="Secondary" value={form.secondaryDark} onChange={(v) => setForm((f) => ({ ...f, secondaryDark: v }))} />
              <ColorField label="Secondary foreground" value={form.secondaryForegroundDark} onChange={(v) => setForm((f) => ({ ...f, secondaryForegroundDark: v }))} />
              <ColorField label="Accent" value={form.accentDark} onChange={(v) => setForm((f) => ({ ...f, accentDark: v }))} />
              <ColorField label="Accent foreground" value={form.accentForegroundDark} onChange={(v) => setForm((f) => ({ ...f, accentForegroundDark: v }))} />
            </div>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            disabled={saving || !form.slug.trim() || !form.name.trim()}
            onClick={handleSubmit}
            className={primaryButtonClass}
          >
            {form.id ? 'Save changes' : 'Add theme'}
          </button>
          {form.id && (
            <button type="button" onClick={() => setForm(emptyThemeForm)} className={secondaryButtonClass}>
              Cancel
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-2 text-sm text-danger">
          {error}
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Slug</th>
              <th className="px-4 py-3">Preview</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                  Loading…
                </td>
              </tr>
            )}
            {!loading && items.length === 0 && (
              <tr>
                <td colSpan={5}>
                  <EmptyTableState icon={Palette} message="No themes yet." />
                </td>
              </tr>
            )}
            {!loading &&
              items.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3 text-muted-foreground">{item.sort_order}</td>
                  <td className="px-4 py-3 text-foreground">{item.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{item.slug}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <span
                        className="h-5 w-5 rounded-full border border-border"
                        style={{ backgroundColor: item.primary_light }}
                      />
                      <span
                        className="h-5 w-5 rounded-full border border-border"
                        style={{ backgroundColor: item.secondary_light }}
                      />
                      <span
                        className="h-5 w-5 rounded-full border border-border"
                        style={{ backgroundColor: item.accent_light }}
                      />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        className={rowButtonClass}
                        onClick={() =>
                          setForm({
                            id: item.id,
                            slug: item.slug,
                            name: item.name,
                            sortOrder: String(item.sort_order),
                            primaryLight: item.primary_light,
                            primaryForegroundLight: item.primary_foreground_light,
                            secondaryLight: item.secondary_light,
                            secondaryForegroundLight: item.secondary_foreground_light,
                            accentLight: item.accent_light,
                            accentForegroundLight: item.accent_foreground_light,
                            primaryDark: item.primary_dark,
                            primaryForegroundDark: item.primary_foreground_dark,
                            secondaryDark: item.secondary_dark,
                            secondaryForegroundDark: item.secondary_foreground_dark,
                            accentDark: item.accent_dark,
                            accentForegroundDark: item.accent_foreground_dark,
                          })
                        }
                      >
                        <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                        Edit
                      </button>
                      <button type="button" className={dangerButtonClass} onClick={() => handleDelete(item.id)}>
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">{items.length} total themes.</p>
    </div>
  );
}
