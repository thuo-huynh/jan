'use client';

import { useMemo, useState } from 'react';
import { CheckCircle2, Info } from 'lucide-react';
import { createClient } from '@/shared/supabase/client';
import { parseGrammarHtml } from '../lib/parseGrammarHtml';
import type { GrammarPointRecord } from '../lib/mapGrammarPoint';

interface GrammarHtmlImportFormProps {
  /** Patterns the caller already has (global + own) — used to skip re-importing the same point on a repeat paste. */
  existingPatterns: string[];
  onImported: (rows: GrammarPointRecord[]) => void;
  onCancel: () => void;
}

const GRAMMAR_RECORD_COLUMNS =
  'id, user_id, pattern, meaning, connection_form, formality_nuance, example_sentences, jlpt_level, frequency_tag, n3_overlap';

/**
 * Paste-a-whole-HTML-page import for grammar points — the bulk-add
 * counterpart to GrammarPointForm's one-at-a-time entry, for pulling many
 * patterns out of a personal study doc (e.g. a hand-built multi-tab grammar
 * notebook) in one action instead of retyping each one. Parses client-side
 * (parseGrammarHtml, DOMParser) so nothing is ever sent anywhere or rendered
 * as HTML — only extracted plain text is inserted, same safety property as
 * every other custom-entry form in this app.
 */
export function GrammarHtmlImportForm({ existingPatterns, onImported, onCancel }: GrammarHtmlImportFormProps) {
  const [html, setHtml] = useState('');
  const [jlptLevel, setJlptLevel] = useState('N2');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const existingSet = useMemo(() => new Set(existingPatterns), [existingPatterns]);

  const { toImport, skipped } = useMemo(() => {
    if (!html.trim()) return { toImport: [], skipped: 0 };
    const parsed = parseGrammarHtml(html);
    const fresh = parsed.filter((row) => !existingSet.has(row.pattern));
    return { toImport: fresh, skipped: parsed.length - fresh.length };
  }, [html, existingSet]);

  async function handleImport() {
    if (toImport.length === 0) return;
    setSubmitting(true);
    setSubmitError(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSubmitting(false);
      setSubmitError('Bạn cần đăng nhập.');
      return;
    }

    const { data, error } = await supabase
      .from('grammar_points')
      .insert(
        toImport.map((row) => ({
          user_id: user.id,
          pattern: row.pattern,
          meaning: row.meaning,
          example_sentences: row.exampleSentences,
          jlpt_level: jlptLevel.trim() || 'N2',
        })),
      )
      .select(GRAMMAR_RECORD_COLUMNS);

    setSubmitting(false);
    if (error || !data) {
      setSubmitError(error?.message ?? 'Nhập thất bại');
      return;
    }

    onImported(data as GrammarPointRecord[]);
    setHtml('');
  }

  return (
    <div className="card space-y-3 p-4">
      <div>
        <label className="label-field" htmlFor="grammar-html-input">
          Dán toàn bộ nội dung HTML vào đây
        </label>
        <textarea
          id="grammar-html-input"
          value={html}
          onChange={(e) => setHtml(e.target.value)}
          rows={8}
          placeholder="Dán mã HTML từ file ghi chú ngữ pháp của bạn…"
          className="textarea-field font-mono text-xs"
        />
        <p className="helper-text flex items-start gap-1.5">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          Chỉ nhận diện được các bảng có cấu trúc mẫu ngữ pháp (dòng có cột &quot;pattern&quot; +
          ví dụ) — phần đọc hiểu, từ vựng, hoặc văn xuôi sẽ bị bỏ qua. Bạn có thể thêm tay những
          mục còn thiếu sau khi nhập.
        </p>
      </div>

      <div className="max-w-[10rem]">
        <label className="label-field">Cấp độ JLPT (áp dụng cho cả lô)</label>
        <input value={jlptLevel} onChange={(e) => setJlptLevel(e.target.value)} className="input-field" />
      </div>

      {html.trim() && (
        <div className="space-y-2 rounded-lg border border-border p-3">
          {toImport.length > 0 ? (
            <div className="flex items-center gap-1.5 text-sm text-success">
              <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
              {toImport.length} điểm ngữ pháp sẵn sàng để nhập
              {skipped > 0 && <span className="text-muted-foreground">({skipped} đã có, bỏ qua)</span>}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {skipped > 0
                ? `Không có điểm mới — cả ${skipped} điểm tìm thấy đều đã có trong danh sách của bạn.`
                : 'Không nhận diện được điểm ngữ pháp nào trong nội dung này.'}
            </p>
          )}
          {toImport.length > 0 && (
            <ul className="max-h-48 space-y-1 overflow-y-auto text-sm">
              {toImport.map((row, i) => (
                <li key={i} className="flex items-baseline gap-2 truncate text-foreground">
                  <span className="font-jp font-medium">{row.pattern}</span>
                  <span className="truncate text-muted-foreground">— {row.meaning}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {submitError && <p className="error-text">{submitError}</p>}

      <div className="flex gap-2">
        <button
          type="button"
          disabled={submitting || toImport.length === 0}
          onClick={handleImport}
          className="btn-primary"
        >
          {submitting ? 'Đang nhập…' : toImport.length > 0 ? `Nhập ${toImport.length} điểm` : 'Nhập'}
        </button>
        <button type="button" onClick={onCancel} className="btn-outline">
          Hủy
        </button>
      </div>
    </div>
  );
}
