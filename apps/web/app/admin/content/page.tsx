'use client';

import { useCallback, useEffect, useState } from 'react';
import { Inbox, Search } from 'lucide-react';
import { TableSkeletonRows } from '@/shared/components/TableSkeletonRows';
import { useConfirm } from '@/shared/hooks/useConfirm';

/**
 * T094 — Admin content moderation page (search/inspect/remove).
 * Calls T088 (`GET /api/admin/content`, `DELETE /api/admin/content/:type/:id`).
 * `grammar_notes` maps to `user_grammar_status.notes_user` (see
 * `app/api/admin/content/_shared.ts`) — deleting one clears the note rather
 * than removing the whole status row, so its action button reads "Clear
 * note" instead of "Delete".
 */
const CONTENT_TYPES = [
  { value: 'tasks', label: 'Công việc' },
  { value: 'notes', label: 'Ghi chú' },
  { value: 'vocab', label: 'Từ vựng tự thêm' },
  { value: 'grammar_notes', label: 'Ghi chú ngữ pháp' },
  { value: 'reading_logs', label: 'Nhật ký đọc' },
  { value: 'listening_logs', label: 'Nhật ký nghe' },
  { value: 'reading_passages', label: 'Bài đọc hiểu' },
] as const;

type ContentType = (typeof CONTENT_TYPES)[number]['value'];

type ContentItem = Record<string, unknown> & { id: string; ownerEmail: string | null };

const PAGE_SIZE = 25;

/** Field(s) used as the primary "what is this" summary text per content type. */
function summaryOf(type: ContentType, item: ContentItem): string {
  switch (type) {
    case 'tasks':
      return String(item.title ?? '');
    case 'notes':
      return String(item.title ?? '');
    case 'vocab':
      return `${item.word ?? ''} — ${item.meaning ?? ''}`;
    case 'grammar_notes':
      return `${item.grammarPattern ?? ''}: ${item.notesUser ?? ''}`;
    case 'reading_logs':
    case 'listening_logs':
      return `${item.source ?? ''} — ${item.comprehensionScore ?? '?'}%`;
    case 'reading_passages':
      return `${item.title ?? ''} — ${item.questionCount ?? 0} câu hỏi`;
    default:
      return '';
  }
}

function createdAtOf(item: ContentItem): string | null {
  const value = (item.createdAt ?? item.updatedAt ?? item.practicedAt) as string | undefined;
  return value ?? null;
}

export default function AdminContentPage() {
  const [type, setType] = useState<ContentType>('tasks');
  const [query, setQuery] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<ContentItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const { confirm, confirmDialog } = useConfirm();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ type, page: String(page) });
      if (query.trim()) params.set('query', query.trim());
      if (ownerEmail.trim()) params.set('ownerEmail', ownerEmail.trim());
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);
      const res = await fetch(`/api/admin/content?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Không tải được nội dung');
      setItems(json.items);
      setTotal(json.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được nội dung');
    } finally {
      setLoading(false);
    }
  }, [type, page, query, ownerEmail, dateFrom, dateTo]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleRemove(item: ContentItem) {
    const isNote = type === 'grammar_notes';
    const confirmed = await confirm(
      isNote
        ? { title: 'Xóa ghi chú cá nhân này?' }
        : { title: 'Xóa mục nội dung này?', description: 'Không thể hoàn tác thao tác này.' }
    );
    if (!confirmed) return;

    setBusyId(item.id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/content/${type}/${item.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Thao tác thất bại');
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      setTotal((t) => Math.max(0, t - 1));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Thao tác thất bại');
    } finally {
      setBusyId(null);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      {confirmDialog}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Kiểm duyệt nội dung
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Xem và xóa nội dung do người dùng tạo.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {CONTENT_TYPES.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => {
              setType(t.value);
              setPage(1);
            }}
            className={
              t.value === type
                ? 'rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground'
                : 'rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted'
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          load();
        }}
        className="flex flex-wrap items-end gap-2"
      >
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm nội dung…"
          aria-label="Tìm nội dung"
          className="input-field max-w-sm"
        />
        <input
          type="text"
          value={ownerEmail}
          onChange={(e) => setOwnerEmail(e.target.value)}
          placeholder="Email chủ sở hữu…"
          aria-label="Lọc theo email chủ sở hữu"
          className="input-field max-w-xs"
        />
        <div className="flex items-end gap-2">
          <label className="flex flex-col gap-1">
            <span className="label-field text-xs">Từ ngày</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              aria-label="Từ ngày"
              className="input-field"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="label-field text-xs">Đến ngày</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              aria-label="Đến ngày"
              className="input-field"
            />
          </label>
        </div>
        <button type="submit" className="btn-outline shrink-0">
          <Search className="h-4 w-4" aria-hidden="true" />
          Tìm
        </button>
      </form>

      {error && (
        <div className="border-danger/30 bg-danger/10 rounded-lg border px-4 py-2 text-sm text-danger">
          {error}
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Chủ sở hữu</th>
              <th className="px-4 py-3">Tóm tắt</th>
              <th className="px-4 py-3">Ngày tạo</th>
              <th className="px-4 py-3 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading && <TableSkeletonRows columns={4} />}
            {!loading && items.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-12">
                  <div className="flex flex-col items-center gap-2 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                      <Inbox className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {query ? 'Không có mục nào khớp với tìm kiếm.' : 'Không tìm thấy mục nào.'}
                    </p>
                  </div>
                </td>
              </tr>
            )}
            {!loading &&
              items.map((item) => {
                const createdAt = createdAtOf(item);
                return (
                  <tr key={item.id}>
                    <td className="px-4 py-3 text-muted-foreground">{item.ownerEmail ?? '—'}</td>
                    <td className="max-w-md truncate px-4 py-3 text-foreground">
                      {summaryOf(type, item) || <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {createdAt ? new Date(createdAt).toLocaleDateString('vi-VN') : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end">
                        <button
                          type="button"
                          disabled={busyId === item.id}
                          onClick={() => handleRemove(item)}
                          className="btn-outline border-danger/40 hover:bg-danger/10 h-8 px-3 text-xs text-danger"
                        >
                          {type === 'grammar_notes' ? 'Xóa ghi chú' : 'Xóa'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Trang {page} / {totalPages} ({total} mục)
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="btn-outline h-8 px-3 text-xs disabled:opacity-40"
          >
            Trước
          </button>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="btn-outline h-8 px-3 text-xs disabled:opacity-40"
          >
            Sau
          </button>
        </div>
      </div>
    </div>
  );
}
