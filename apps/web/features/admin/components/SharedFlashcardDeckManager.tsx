'use client';

import { useCallback, useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, BookOpenCheck, Plus, Search, Trash2, X } from 'lucide-react';
import { useConfirm } from '@/shared/hooks/useConfirm';

type VocabOption = { id: string; word: string; reading: string | null; meaning: string };
type DeckEntry = {
  vocab_id: string;
  position: number;
  vocab_entries: VocabOption | VocabOption[] | null;
};
type SharedFlashcardDeck = {
  id: string;
  title: string;
  description: string | null;
  jlpt_level: string | null;
  labels: string[];
  is_published: boolean;
  shared_flashcard_deck_entries: DeckEntry[];
};

const emptyForm = {
  id: null as string | null,
  title: '',
  description: '',
  jlptLevel: 'N2',
  labelsText: '',
  isPublished: false,
  vocab: [] as VocabOption[],
};

function entryVocab(entry: DeckEntry) {
  return Array.isArray(entry.vocab_entries) ? entry.vocab_entries[0] : entry.vocab_entries;
}

/** Admin-only curator for metadata and global vocabulary membership in shared Flashcard decks. */
export function SharedFlashcardDeckManager() {
  const [items, setItems] = useState<SharedFlashcardDeck[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState('');
  const [matches, setMatches] = useState<VocabOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { confirm, confirmDialog } = useConfirm();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/reference-data/flashcard-decks');
      const json = await response.json();
      if (!response.ok) throw new Error(json.error ?? 'Không tải được bộ Flashcards.');
      setItems(json.items ?? []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không tải được bộ Flashcards.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function searchVocabulary() {
    if (!search.trim()) {
      setMatches([]);
      return;
    }
    const response = await fetch(
      `/api/admin/reference-data/vocab?${new URLSearchParams({ query: search.trim() }).toString()}`
    );
    const json = await response.json();
    if (!response.ok) {
      setError(json.error ?? 'Không tìm được từ vựng.');
      return;
    }
    setMatches(json.items ?? []);
  }

  function addVocab(vocab: VocabOption) {
    setForm((current) =>
      current.vocab.some((item) => item.id === vocab.id)
        ? current
        : { ...current, vocab: [...current.vocab, vocab] }
    );
  }

  function removeVocab(vocabId: string) {
    setForm((current) => ({
      ...current,
      vocab: current.vocab.filter((item) => item.id !== vocabId),
    }));
  }

  function moveVocab(vocabId: string, direction: -1 | 1) {
    setForm((current) => {
      const index = current.vocab.findIndex((item) => item.id === vocabId);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= current.vocab.length) return current;

      const vocab = [...current.vocab];
      [vocab[index], vocab[target]] = [vocab[target], vocab[index]];
      return { ...current, vocab };
    });
  }

  function edit(deck: SharedFlashcardDeck) {
    const vocab = [...deck.shared_flashcard_deck_entries]
      .sort((a, b) => a.position - b.position)
      .flatMap((entry) => {
        const value = entryVocab(entry);
        return value ? [value] : [];
      });
    setForm({
      id: deck.id,
      title: deck.title,
      description: deck.description ?? '',
      jlptLevel: deck.jlpt_level ?? '',
      labelsText: deck.labels.join(', '),
      isPublished: deck.is_published,
      vocab,
    });
    setMatches([]);
    setSearch('');
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        jlptLevel: form.jlptLevel.trim() || null,
        labels: form.labelsText
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
        isPublished: form.isPublished,
        vocabIds: form.vocab.map((item) => item.id),
      };
      const response = await fetch('/api/admin/reference-data/flashcard-decks', {
        method: form.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form.id ? { id: form.id, ...payload } : payload),
      });
      const json = await response.json();
      if (!response.ok)
        throw new Error(
          json.error?.formErrors?.[0] ?? json.error ?? 'Không thể lưu bộ Flashcards.'
        );
      setForm(emptyForm);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể lưu bộ Flashcards.');
    } finally {
      setSaving(false);
    }
  }

  async function removeDeck(deck: SharedFlashcardDeck) {
    const ok = await confirm({
      title: `Xóa bộ "${deck.title}"?`,
      description: 'Thao tác này không xóa các từ vựng dùng chung trong kho.',
    });
    if (!ok) return;
    setError(null);
    const response = await fetch(`/api/admin/reference-data/flashcard-decks?id=${deck.id}`, {
      method: 'DELETE',
    });
    const json = await response.json();
    if (!response.ok) {
      setError(json.error ?? 'Không thể xóa bộ Flashcards.');
      return;
    }
    if (form.id === deck.id) setForm(emptyForm);
    await load();
  }

  return (
    <div className="space-y-6">
      {confirmDialog}
      <div className="card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-foreground">
              {form.id ? 'Sửa bộ Flashcards' : 'Tạo bộ Flashcards'}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Chỉ chọn từ vựng trong kho dùng chung để xuất bản cho người học.
            </p>
          </div>
          {form.id && (
            <button
              type="button"
              onClick={() => setForm(emptyForm)}
              className="btn-outline h-9 px-3 text-sm"
            >
              Tạo bộ mới
            </button>
          )}
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label-field">Tên bộ</label>
            <input
              value={form.title}
              onChange={(event) =>
                setForm((current) => ({ ...current, title: event.target.value }))
              }
              className="input-field"
              placeholder="Ví dụ: N2 – Từ vựng du lịch"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label-field">Mô tả</label>
            <textarea
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({ ...current, description: event.target.value }))
              }
              className="textarea-field"
              rows={3}
              placeholder="Người học sẽ nhận được gì từ bộ này?"
            />
          </div>
          <div>
            <label className="label-field">Cấp độ JLPT</label>
            <input
              value={form.jlptLevel}
              onChange={(event) =>
                setForm((current) => ({ ...current, jlptLevel: event.target.value }))
              }
              className="input-field"
              placeholder="N2"
            />
          </div>
          <div>
            <label className="label-field">Nhãn, cách nhau bởi dấu phẩy</label>
            <input
              value={form.labelsText}
              onChange={(event) =>
                setForm((current) => ({ ...current, labelsText: event.target.value }))
              }
              className="input-field"
              placeholder="du lịch, hội thoại"
            />
          </div>
        </div>

        <div className="bg-muted/30 mt-5 rounded-lg border border-border p-4">
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-56 flex-1">
              <label className="label-field">Tìm từ trong kho dùng chung</label>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    searchVocabulary();
                  }
                }}
                className="input-field"
                placeholder="Nhập từ hoặc nghĩa"
              />
            </div>
            <button type="button" onClick={searchVocabulary} className="btn-outline h-10 px-3">
              <Search className="h-4 w-4" aria-hidden="true" />
              Tìm
            </button>
          </div>
          {matches.length > 0 && (
            <ul className="mt-3 max-h-48 divide-y divide-border overflow-y-auto rounded border border-border bg-card">
              {matches.map((vocab) => (
                <li key={vocab.id} className="flex items-center justify-between gap-3 px-3 py-2">
                  <span className="min-w-0">
                    <span className="font-jp font-medium text-foreground">{vocab.word}</span>
                    {vocab.reading && (
                      <span className="ml-2 font-jp text-xs text-muted-foreground">
                        {vocab.reading}
                      </span>
                    )}
                    <span className="ml-2 text-sm text-muted-foreground">{vocab.meaning}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => addVocab(vocab)}
                    disabled={form.vocab.some((item) => item.id === vocab.id)}
                    className="btn-outline h-8 shrink-0 px-2 text-xs disabled:opacity-50"
                  >
                    <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                    Thêm
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4">
            <p className="text-sm font-semibold text-foreground">{form.vocab.length} từ trong bộ</p>
            {form.vocab.length === 0 ? (
              <p className="mt-1 text-sm text-muted-foreground">
                Tìm và thêm từ để có thể xuất bản bộ này.
              </p>
            ) : (
              <ol className="mt-2 grid gap-2 sm:grid-cols-2">
                {form.vocab.map((vocab, index) => (
                  <li
                    key={vocab.id}
                    className="flex items-center justify-between gap-2 rounded border border-border bg-card px-3 py-2"
                  >
                    <span className="min-w-0 truncate">
                      <span className="mr-2 text-xs font-medium tabular-nums text-muted-foreground">
                        {index + 1}.
                      </span>
                      <span className="font-jp font-medium text-foreground">{vocab.word}</span>
                      <span className="ml-2 text-xs text-muted-foreground">{vocab.meaning}</span>
                    </span>
                    <span className="flex shrink-0 items-center">
                      <button
                        type="button"
                        onClick={() => moveVocab(vocab.id, -1)}
                        disabled={index === 0}
                        aria-label={`Đưa ${vocab.word} lên`}
                        className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        <ArrowUp className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveVocab(vocab.id, 1)}
                        disabled={index === form.vocab.length - 1}
                        aria-label={`Đưa ${vocab.word} xuống`}
                        className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        <ArrowDown className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeVocab(vocab.id)}
                        aria-label={`Bỏ ${vocab.word}`}
                        className="hover:bg-danger/10 flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:text-danger"
                      >
                        <X className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>

        <label className="mt-5 flex items-center gap-2 text-sm font-medium text-foreground">
          <input
            type="checkbox"
            checked={form.isPublished}
            onChange={(event) =>
              setForm((current) => ({ ...current, isPublished: event.target.checked }))
            }
            className="h-4 w-4 rounded border-border accent-primary"
          />
          Xuất bản để người học nhìn thấy
        </label>
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            disabled={saving || !form.title.trim() || (form.isPublished && form.vocab.length === 0)}
            onClick={save}
            className="btn-primary"
          >
            {saving ? 'Đang lưu…' : form.id ? 'Lưu thay đổi' : 'Tạo bộ'}
          </button>
          {form.id && (
            <button type="button" onClick={() => setForm(emptyForm)} className="btn-outline">
              Hủy
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="border-danger/30 bg-danger/10 rounded-lg border px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      <div className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">Các bộ đã tạo</h2>
        {loading ? (
          <p className="text-sm text-muted-foreground">Đang tải…</p>
        ) : items.length === 0 ? (
          <div className="card flex flex-col items-center gap-2 py-10 text-center">
            <BookOpenCheck className="h-7 w-7 text-muted-foreground" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">Chưa có bộ Flashcards dùng chung nào.</p>
          </div>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {items.map((deck) => (
              <article key={deck.id} className="card flex items-start justify-between gap-4 p-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate text-sm font-semibold text-foreground">{deck.title}</h3>
                    <span className={deck.is_published ? 'badge-success' : 'badge-neutral'}>
                      {deck.is_published ? 'Đã xuất bản' : 'Bản nháp'}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {deck.shared_flashcard_deck_entries.length} thẻ
                    {deck.jlpt_level ? ` · ${deck.jlpt_level}` : ''}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => edit(deck)}
                    className="btn-outline h-8 px-3 text-xs"
                  >
                    Sửa
                  </button>
                  <button
                    type="button"
                    onClick={() => removeDeck(deck)}
                    aria-label={`Xóa ${deck.title}`}
                    className="hover:bg-danger/10 flex h-8 w-8 items-center justify-center rounded text-muted-foreground hover:text-danger"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
