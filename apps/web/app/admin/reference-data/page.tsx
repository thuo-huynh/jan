'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  BookMarked,
  CheckCircle2,
  GitCompare,
  Palette,
  Pencil,
  PackageOpen,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { TableSkeletonRows } from '@/shared/components/TableSkeletonRows';
import { useConfirm } from '@/shared/hooks/useConfirm';
import { parseBulkVocabInput } from '@/features/vocab-srs/lib/bulkParse';

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
        Trang {page} / {totalPages} ({total} {itemLabel})
      </span>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(Math.max(1, page - 1))}
          className="btn-outline h-8 px-3 text-xs disabled:opacity-40"
        >
          Trước
        </button>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          className="btn-outline h-8 px-3 text-xs disabled:opacity-40"
        >
          Sau
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
  { value: 'vocab', label: 'Từ vựng & Hán tự' },
  { value: 'grammar', label: 'Điểm ngữ pháp' },
  { value: 'pairs', label: 'Cặp dễ nhầm' },
  { value: 'themes', label: 'Giao diện' },
];

export default function AdminReferenceDataPage() {
  const [tab, setTab] = useState<Tab>('vocab');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Dữ liệu tham chiếu
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Quản lý kho từ vựng, Hán tự, điểm ngữ pháp và cặp dễ nhầm N2 dùng chung/toàn cục — độc
          lập với các mục tự thêm hoặc ghi chú cá nhân của người dùng.
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
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const { confirm, confirmDialog } = useConfirm();

  const { entries: bulkEntries, errors: bulkParseErrors } = useMemo(() => parseBulkVocabInput(bulkText), [bulkText]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (query.trim()) params.set('query', query.trim());
      const res = await fetch(`/api/admin/reference-data/vocab?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Không tải được từ vựng');
      setItems(json.items);
      setTotal(json.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được từ vựng');
    } finally {
      setLoading(false);
    }
  }, [query, page]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleBulkImport() {
    if (bulkEntries.length === 0) return;
    setBulkSubmitting(true);
    setBulkError(null);
    try {
      const res = await fetch('/api/admin/reference-data/vocab/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entries: bulkEntries, jlptLevel: 'N2', isKanji: false }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.formErrors?.[0] ?? json.error ?? 'Nhập thất bại');
      setBulkText('');
      setBulkOpen(false);
      setPage(1);
      await load();
    } catch (err) {
      setBulkError(err instanceof Error ? err.message : 'Nhập thất bại');
    } finally {
      setBulkSubmitting(false);
    }
  }

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
      if (!res.ok) throw new Error(json.error?.formErrors?.[0] ?? json.error ?? 'Lưu thất bại');
      setForm(emptyVocabForm);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lưu thất bại');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!(await confirm({ title: 'Xóa mục từ vựng/Hán tự toàn cục này?' }))) return;
    setError(null);
    try {
      const res = await fetch(`/api/admin/reference-data/vocab?id=${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Xóa thất bại');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Xóa thất bại');
    }
  }

  return (
    <div className="space-y-6">
      {confirmDialog}
      <div className="card">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-foreground">
            {form.id ? 'Sửa mục' : 'Thêm mục mới'}
          </h2>
          {!form.id && (
            <button type="button" onClick={() => setBulkOpen((v) => !v)} className={secondaryButtonClass}>
              {bulkOpen ? (
                <>
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                  Đóng
                </>
              ) : (
                <>
                  <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                  Nhập hàng loạt
                </>
              )}
            </button>
          )}
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Từ</label>
            <input
              className={inputClass}
              value={form.word}
              onChange={(e) => setForm((f) => ({ ...f, word: e.target.value }))}
            />
          </div>
          <div>
            <label className={labelClass}>Cách đọc</label>
            <input
              className={inputClass}
              value={form.reading}
              onChange={(e) => setForm((f) => ({ ...f, reading: e.target.value }))}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Nghĩa</label>
            <input
              className={inputClass}
              value={form.meaning}
              onChange={(e) => setForm((f) => ({ ...f, meaning: e.target.value }))}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Ví dụ</label>
            <input
              className={inputClass}
              value={form.example}
              onChange={(e) => setForm((f) => ({ ...f, example: e.target.value }))}
            />
          </div>
          <div>
            <label className={labelClass}>Cấp độ JLPT</label>
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
              Là Hán tự
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
            {form.id ? 'Lưu thay đổi' : 'Thêm mục'}
          </button>
          {form.id && (
            <button type="button" onClick={() => setForm(emptyVocabForm)} className={secondaryButtonClass}>
              Hủy
            </button>
          )}
        </div>
      </div>

      {bulkOpen && (
        <div className="card space-y-3">
          <div>
            <label className={labelClass} htmlFor="vocab-bulk-input">
              Dán danh sách từ vào đây
            </label>
            <textarea
              id="vocab-bulk-input"
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              rows={8}
              placeholder={'食べる\tたべる\tto eat\n飲む\tのむ\tto drink\n走る - to run'}
              className="textarea-field font-jp"
            />
            <p className="helper-text">
              Mỗi dòng một từ: từ + cách đọc (không bắt buộc) + nghĩa, cách nhau bằng tab (dán từ
              Excel/Sheets), hoặc từ - nghĩa. Tất cả sẽ được thêm vào kho chung (N2, không phải Hán
              tự) — sửa cấp độ/Hán tự riêng từng mục sau nếu cần.
            </p>
          </div>

          {(bulkEntries.length > 0 || bulkParseErrors.length > 0) && (
            <div className="space-y-2 rounded-lg border border-border p-3">
              {bulkEntries.length > 0 && (
                <div className="flex items-center gap-1.5 text-sm text-success">
                  <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {bulkEntries.length} từ sẵn sàng để nhập
                </div>
              )}
              {bulkEntries.length > 0 && (
                <ul className="max-h-40 space-y-1 overflow-y-auto text-sm">
                  {bulkEntries.map((e, i) => (
                    <li key={i} className="flex items-baseline gap-2 truncate text-foreground">
                      <span className="font-jp font-medium">{e.word}</span>
                      {e.reading && <span className="font-jp text-xs text-muted-foreground">{e.reading}</span>}
                      <span className="truncate text-muted-foreground">— {e.meaning}</span>
                    </li>
                  ))}
                </ul>
              )}
              {bulkParseErrors.length > 0 && (
                <div className="space-y-1 border-t border-border pt-2">
                  <div className="flex items-center gap-1.5 text-sm text-danger">
                    <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                    {bulkParseErrors.length} dòng không thể phân tích
                  </div>
                  <ul className="max-h-24 space-y-0.5 overflow-y-auto text-xs text-muted-foreground">
                    {bulkParseErrors.map((e) => (
                      <li key={e.line} className="truncate">
                        Dòng {e.line}: &quot;{e.raw}&quot; — {e.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {bulkError && <p className="error-text">{bulkError}</p>}

          <div className="flex gap-2">
            <button
              type="button"
              disabled={bulkSubmitting || bulkEntries.length === 0}
              onClick={handleBulkImport}
              className={primaryButtonClass}
            >
              {bulkSubmitting
                ? 'Đang nhập…'
                : bulkEntries.length > 0
                  ? `Nhập ${bulkEntries.length} từ`
                  : 'Nhập'}
            </button>
            <button
              type="button"
              onClick={() => {
                setBulkOpen(false);
                setBulkText('');
                setBulkError(null);
              }}
              className={secondaryButtonClass}
            >
              Hủy
            </button>
          </div>
        </div>
      )}

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
          placeholder="Tìm từ/nghĩa…"
          aria-label="Tìm từ/nghĩa"
          value={query}
          onChange={(e) => {
            setPage(1);
            setQuery(e.target.value);
          }}
        />
        <button type="submit" className={secondaryButtonClass}>
          Tìm
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
              <th className="px-4 py-3">Từ</th>
              <th className="px-4 py-3">Cách đọc</th>
              <th className="px-4 py-3">Nghĩa</th>
              <th className="px-4 py-3">Hán tự</th>
              <th className="px-4 py-3 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading && <TableSkeletonRows columns={5} />}
            {!loading && items.length === 0 && (
              <tr>
                <td colSpan={5}>
                  <EmptyTableState icon={PackageOpen} message="Không tìm thấy mục nào." />
                </td>
              </tr>
            )}
            {!loading &&
              items.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3 font-jp text-foreground">{item.word}</td>
                  <td className="px-4 py-3 font-jp text-muted-foreground">{item.reading}</td>
                  <td className="px-4 py-3 text-muted-foreground">{item.meaning}</td>
                  <td className="px-4 py-3 text-muted-foreground">{item.is_kanji ? 'Có' : 'Không'}</td>
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
                        Sửa
                      </button>
                      <button type="button" className={dangerButtonClass} onClick={() => handleDelete(item.id)}>
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        Xóa
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      <PaginationBar page={page} total={total} itemLabel="mục toàn cục" onPageChange={setPage} />
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
  const { confirm, confirmDialog } = useConfirm();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (query.trim()) params.set('query', query.trim());
      const res = await fetch(`/api/admin/reference-data/grammar?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Không tải được điểm ngữ pháp');
      setItems(json.items);
      setTotal(json.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được điểm ngữ pháp');
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
      if (!res.ok) throw new Error(json.error?.formErrors?.[0] ?? json.error ?? 'Lưu thất bại');
      setForm(emptyGrammarForm);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lưu thất bại');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    const ok = await confirm({
      title: 'Xóa điểm ngữ pháp toàn cục này?',
      description: 'Các cặp dễ nhầm tham chiếu đến điểm này cũng sẽ bị lỗi.',
    });
    if (!ok) return;
    setError(null);
    try {
      const res = await fetch(`/api/admin/reference-data/grammar?id=${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Xóa thất bại');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Xóa thất bại');
    }
  }

  return (
    <div className="space-y-6">
      {confirmDialog}
      <div className="card">
        <h2 className="text-sm font-semibold text-foreground">
          {form.id ? 'Sửa điểm ngữ pháp' : 'Thêm điểm ngữ pháp mới'}
        </h2>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Mẫu câu (文型)</label>
            <input
              className={inputClass}
              value={form.pattern}
              onChange={(e) => setForm((f) => ({ ...f, pattern: e.target.value }))}
            />
          </div>
          <div>
            <label className={labelClass}>Thể chia (接続)</label>
            <input
              className={inputClass}
              value={form.connectionForm}
              onChange={(e) => setForm((f) => ({ ...f, connectionForm: e.target.value }))}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Nghĩa</label>
            <input
              className={inputClass}
              value={form.meaning}
              onChange={(e) => setForm((f) => ({ ...f, meaning: e.target.value }))}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Mức trang trọng / sắc thái</label>
            <input
              className={inputClass}
              value={form.formalityNuance}
              onChange={(e) => setForm((f) => ({ ...f, formalityNuance: e.target.value }))}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Câu ví dụ (mỗi dòng một câu)</label>
            <textarea
              className="textarea-field"
              rows={3}
              value={form.exampleSentences}
              onChange={(e) => setForm((f) => ({ ...f, exampleSentences: e.target.value }))}
            />
          </div>
          <div>
            <label className={labelClass}>Cấp độ JLPT</label>
            <input
              className={inputClass}
              value={form.jlptLevel}
              onChange={(e) => setForm((f) => ({ ...f, jlptLevel: e.target.value }))}
            />
          </div>
          <div>
            <label className={labelClass}>Tần suất</label>
            <input
              className={inputClass}
              placeholder="cao / trung bình / thấp"
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
              Trùng N3
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
            {form.id ? 'Lưu thay đổi' : 'Thêm điểm ngữ pháp'}
          </button>
          {form.id && (
            <button type="button" onClick={() => setForm(emptyGrammarForm)} className={secondaryButtonClass}>
              Hủy
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
          placeholder="Tìm mẫu câu/nghĩa…"
          aria-label="Tìm mẫu câu/nghĩa"
          value={query}
          onChange={(e) => {
            setPage(1);
            setQuery(e.target.value);
          }}
        />
        <button type="submit" className={secondaryButtonClass}>
          Tìm
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
              <th className="px-4 py-3">Mẫu câu</th>
              <th className="px-4 py-3">Nghĩa</th>
              <th className="px-4 py-3">Tần suất</th>
              <th className="px-4 py-3">Trùng N3</th>
              <th className="px-4 py-3 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading && <TableSkeletonRows columns={5} />}
            {!loading && items.length === 0 && (
              <tr>
                <td colSpan={5}>
                  <EmptyTableState icon={BookMarked} message="Không tìm thấy điểm ngữ pháp nào." />
                </td>
              </tr>
            )}
            {!loading &&
              items.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3 font-jp text-foreground">{item.pattern}</td>
                  <td className="px-4 py-3 text-muted-foreground">{item.meaning}</td>
                  <td className="px-4 py-3 text-muted-foreground">{item.frequency_tag ?? '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{item.n3_overlap ? 'Có' : 'Không'}</td>
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
                        Sửa
                      </button>
                      <button type="button" className={dangerButtonClass} onClick={() => handleDelete(item.id)}>
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        Xóa
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      <PaginationBar page={page} total={total} itemLabel="điểm ngữ pháp" onPageChange={setPage} />
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
  const { confirm, confirmDialog } = useConfirm();

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
      if (!pairsRes.ok) throw new Error(json.error ?? 'Không tải được cặp dễ nhầm');
      setItems(json.items);
      setTotal(json.total);
      setGrammarOptions(options);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được cặp dễ nhầm');
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
      if (!res.ok) throw new Error(json.error?.formErrors?.[0] ?? json.error ?? 'Lưu thất bại');
      setForm(emptyPairForm);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lưu thất bại');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!(await confirm({ title: 'Xóa so sánh cặp dễ nhầm này?' }))) return;
    setError(null);
    try {
      const res = await fetch(`/api/admin/reference-data/confusable-pairs?id=${id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Xóa thất bại');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Xóa thất bại');
    }
  }

  return (
    <div className="space-y-6">
      {confirmDialog}
      <div className="card">
        <h2 className="text-sm font-semibold text-foreground">
          {form.id ? 'Sửa cặp dễ nhầm' : 'Thêm cặp dễ nhầm mới'}
        </h2>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Điểm ngữ pháp A</label>
            <select
              className={inputClass}
              value={form.grammarPointIdA}
              onChange={(e) => setForm((f) => ({ ...f, grammarPointIdA: e.target.value }))}
            >
              <option value="">Chọn…</option>
              {grammarOptions.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.pattern}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Điểm ngữ pháp B</label>
            <select
              className={inputClass}
              value={form.grammarPointIdB}
              onChange={(e) => setForm((f) => ({ ...f, grammarPointIdB: e.target.value }))}
            >
              <option value="">Chọn…</option>
              {grammarOptions.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.pattern}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Ghi chú so sánh</label>
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
            {form.id ? 'Lưu thay đổi' : 'Thêm cặp'}
          </button>
          {form.id && (
            <button type="button" onClick={() => setForm(emptyPairForm)} className={secondaryButtonClass}>
              Hủy
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
          placeholder="Tìm ghi chú so sánh…"
          aria-label="Tìm ghi chú so sánh"
          value={query}
          onChange={(e) => {
            setPage(1);
            setQuery(e.target.value);
          }}
        />
        <button type="submit" className={secondaryButtonClass}>
          Tìm
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
              <th className="px-4 py-3">Cặp</th>
              <th className="px-4 py-3">Ghi chú so sánh</th>
              <th className="px-4 py-3 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading && <TableSkeletonRows columns={3} />}
            {!loading && items.length === 0 && (
              <tr>
                <td colSpan={3}>
                  <EmptyTableState icon={GitCompare} message="Chưa có cặp dễ nhầm nào." />
                </td>
              </tr>
            )}
            {!loading &&
              items.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3 font-jp text-foreground">
                    {item.pointA?.pattern ?? '?'} và {item.pointB?.pattern ?? '?'}
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
                        Sửa
                      </button>
                      <button type="button" className={dangerButtonClass} onClick={() => handleDelete(item.id)}>
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        Xóa
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      <PaginationBar page={page} total={total} itemLabel="cặp dễ nhầm" onPageChange={setPage} />
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
  const { confirm, confirmDialog } = useConfirm();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/reference-data/themes');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Không tải được giao diện');
      setItems(json.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được giao diện');
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
      if (!res.ok) throw new Error(json.error?.formErrors?.[0] ?? json.error ?? 'Lưu thất bại');
      setForm(emptyThemeForm);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lưu thất bại');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    const ok = await confirm({
      title: 'Xóa giao diện này?',
      description: 'Người dùng đang chọn giao diện này sẽ tự động chuyển về giao diện mặc định.',
    });
    if (!ok) return;
    setError(null);
    try {
      const res = await fetch(`/api/admin/reference-data/themes?id=${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Xóa thất bại');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Xóa thất bại');
    }
  }

  return (
    <div className="space-y-6">
      {confirmDialog}
      <div className="card">
        <h2 className="text-sm font-semibold text-foreground">
          {form.id ? 'Sửa giao diện' : 'Thêm giao diện mới'}
        </h2>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label className={labelClass}>Tên</label>
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
            <label className={labelClass}>Thứ tự sắp xếp</label>
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
              Chế độ sáng
            </h3>
            <div className="space-y-3">
              <ColorField label="Màu chính" value={form.primaryLight} onChange={(v) => setForm((f) => ({ ...f, primaryLight: v }))} />
              <ColorField label="Chữ trên nền chính" value={form.primaryForegroundLight} onChange={(v) => setForm((f) => ({ ...f, primaryForegroundLight: v }))} />
              <ColorField label="Màu phụ" value={form.secondaryLight} onChange={(v) => setForm((f) => ({ ...f, secondaryLight: v }))} />
              <ColorField label="Chữ trên nền phụ" value={form.secondaryForegroundLight} onChange={(v) => setForm((f) => ({ ...f, secondaryForegroundLight: v }))} />
              <ColorField label="Màu nhấn" value={form.accentLight} onChange={(v) => setForm((f) => ({ ...f, accentLight: v }))} />
              <ColorField label="Chữ trên nền nhấn" value={form.accentForegroundLight} onChange={(v) => setForm((f) => ({ ...f, accentForegroundLight: v }))} />
            </div>
          </div>
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Chế độ tối
            </h3>
            <div className="space-y-3">
              <ColorField label="Màu chính" value={form.primaryDark} onChange={(v) => setForm((f) => ({ ...f, primaryDark: v }))} />
              <ColorField label="Chữ trên nền chính" value={form.primaryForegroundDark} onChange={(v) => setForm((f) => ({ ...f, primaryForegroundDark: v }))} />
              <ColorField label="Màu phụ" value={form.secondaryDark} onChange={(v) => setForm((f) => ({ ...f, secondaryDark: v }))} />
              <ColorField label="Chữ trên nền phụ" value={form.secondaryForegroundDark} onChange={(v) => setForm((f) => ({ ...f, secondaryForegroundDark: v }))} />
              <ColorField label="Màu nhấn" value={form.accentDark} onChange={(v) => setForm((f) => ({ ...f, accentDark: v }))} />
              <ColorField label="Chữ trên nền nhấn" value={form.accentForegroundDark} onChange={(v) => setForm((f) => ({ ...f, accentForegroundDark: v }))} />
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
            {form.id ? 'Lưu thay đổi' : 'Thêm giao diện'}
          </button>
          {form.id && (
            <button type="button" onClick={() => setForm(emptyThemeForm)} className={secondaryButtonClass}>
              Hủy
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
              <th className="px-4 py-3">Thứ tự</th>
              <th className="px-4 py-3">Tên</th>
              <th className="px-4 py-3">Slug</th>
              <th className="px-4 py-3">Xem trước</th>
              <th className="px-4 py-3 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading && <TableSkeletonRows columns={5} />}
            {!loading && items.length === 0 && (
              <tr>
                <td colSpan={5}>
                  <EmptyTableState icon={Palette} message="Chưa có giao diện nào." />
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
                    <div className="space-y-1">
                      <div className="flex items-center gap-1">
                        <span className="w-8 text-[10px] uppercase text-muted-foreground">Sáng</span>
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
                      <div className="flex items-center gap-1 rounded bg-[#0b0b1a] px-1 py-1">
                        <span className="w-8 text-[10px] uppercase text-white/60">Tối</span>
                        <span
                          className="h-5 w-5 rounded-full border border-white/20"
                          style={{ backgroundColor: item.primary_dark }}
                        />
                        <span
                          className="h-5 w-5 rounded-full border border-white/20"
                          style={{ backgroundColor: item.secondary_dark }}
                        />
                        <span
                          className="h-5 w-5 rounded-full border border-white/20"
                          style={{ backgroundColor: item.accent_dark }}
                        />
                      </div>
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
                        Sửa
                      </button>
                      <button type="button" className={dangerButtonClass} onClick={() => handleDelete(item.id)}>
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        Xóa
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">Tổng cộng {items.length} giao diện.</p>
    </div>
  );
}
