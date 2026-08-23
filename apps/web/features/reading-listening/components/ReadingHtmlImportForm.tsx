'use client';

import { useMemo, useState } from 'react';
import { CheckCircle2, Info } from 'lucide-react';
import { createClient } from '@/shared/supabase/client';
import { parseReadingHtml, type ParsedReadingPassage } from '../lib/parseReadingHtml';
import {
  mapReadingPassage,
  type ReadingPassageQuestionRecord,
  type ReadingPassageRecord,
} from '../lib/mapReadingPassage';
import type { ReadingPassage, ReadingPassageSet } from '../types';

interface ReadingHtmlImportFormProps {
  existingSets: ReadingPassageSet[];
  onSetCreated: (set: ReadingPassageSet) => void;
  onImported: (passages: ReadingPassage[]) => void;
  onCancel: () => void;
}

const UNGROUPED_LABEL = 'Chưa phân loại';

/**
 * Paste-a-whole-HTML-page import for `.dokkai-item` reading passages — the
 * bulk-add counterpart to ReadingPassageForm's one-at-a-time entry, mirroring
 * GrammarHtmlImportForm.tsx file-for-file (specs/004-reading-comprehension
 * research.md §2). Parses client-side (parseReadingHtml, DOMParser) so
 * nothing is ever sent anywhere or rendered as HTML — only extracted
 * structured segments are inserted.
 *
 * Every passage from one import shares a single set named after the source
 * tab (reusing an existing set of that name if one already exists). Unlike
 * Grammar's importer, re-pasting the same document is allowed to create
 * duplicate passages rather than being skipped (spec.md Edge Cases).
 */
export function ReadingHtmlImportForm({ existingSets, onSetCreated, onImported, onCancel }: ReadingHtmlImportFormProps) {
  const [html, setHtml] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const groups = useMemo(() => {
    if (!html.trim()) return [] as { label: string; rows: ParsedReadingPassage[] }[];
    const parsed = parseReadingHtml(html);
    const byLabel = new Map<string, ParsedReadingPassage[]>();
    for (const row of parsed) {
      const label = row.sourceTabLabel ?? UNGROUPED_LABEL;
      const list = byLabel.get(label) ?? [];
      list.push(row);
      byLabel.set(label, list);
    }
    return Array.from(byLabel.entries()).map(([label, rows]) => ({ label, rows }));
  }, [html]);

  const totalToImport = groups.reduce((sum, g) => sum + g.rows.length, 0);

  async function handleImport() {
    if (totalToImport === 0) return;
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

    const existingByName = new Map(existingSets.map((s) => [s.name, s]));
    const setIdByLabel = new Map<string, string>();

    for (const group of groups) {
      const existing = existingByName.get(group.label);
      if (existing) {
        setIdByLabel.set(group.label, existing.id);
        continue;
      }
      const { data: newSet, error: setError } = await supabase
        .from('reading_passage_sets')
        .insert({ user_id: user.id, name: group.label })
        .select('id, name, created_at')
        .single();
      if (setError || !newSet) {
        setSubmitting(false);
        setSubmitError(setError?.message ?? `Không thể tạo set "${group.label}"`);
        return;
      }
      setIdByLabel.set(group.label, newSet.id);
      existingByName.set(group.label, newSet as ReadingPassageSet);
      onSetCreated(newSet as ReadingPassageSet);
    }

    const created: ReadingPassage[] = [];
    for (const group of groups) {
      const setId = setIdByLabel.get(group.label) ?? null;
      for (const row of group.rows) {
        const { data: passageRow, error: passageError } = await supabase
          .from('reading_passages')
          .insert({
            user_id: user.id,
            set_id: setId,
            title: row.title,
            passage_segments: row.segments,
            translation_vn: row.translationVn,
            tip: row.tip,
          })
          .select('id, set_id, title, passage_segments, translation_vn, tip')
          .single();
        if (passageError || !passageRow) {
          setSubmitting(false);
          setSubmitError(passageError?.message ?? `Không thể nhập bài "${row.title}"`);
          return;
        }

        const { data: questionRows, error: questionError } = await supabase
          .from('reading_passage_questions')
          .insert(
            row.questions.map((q, i) => ({
              passage_id: passageRow.id,
              order_index: i,
              question_text: q.questionText,
              choices: q.choices,
              correct_choice_index: q.correctChoiceIndex,
              explanation: q.explanation,
            })),
          )
          .select('id, passage_id, order_index, question_text, choices, correct_choice_index, explanation');
        if (questionError || !questionRows) {
          setSubmitting(false);
          setSubmitError(questionError?.message ?? `Không thể nhập câu hỏi cho bài "${row.title}"`);
          return;
        }

        created.push(
          mapReadingPassage(passageRow as ReadingPassageRecord, questionRows as ReadingPassageQuestionRecord[]),
        );
      }
    }

    setSubmitting(false);
    onImported(created);
    setHtml('');
  }

  return (
    <div className="card space-y-3 p-4">
      <div>
        <label className="label-field" htmlFor="reading-html-input">
          Dán toàn bộ nội dung HTML vào đây
        </label>
        <textarea
          id="reading-html-input"
          value={html}
          onChange={(e) => setHtml(e.target.value)}
          rows={8}
          placeholder="Dán mã HTML từ file ghi chú đọc hiểu của bạn…"
          className="textarea-field font-mono text-xs"
        />
        <p className="helper-text flex items-start gap-1.5">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          Nhận diện các khối bài đọc hiểu (đoạn văn + câu hỏi trắc nghiệm + đáp án + giải thích) —
          nội dung khác sẽ bị bỏ qua. Mỗi tab trong file sẽ tự động thành 1 set riêng.
        </p>
      </div>

      {html.trim() && (
        <div className="space-y-3 rounded-lg border border-border p-3">
          {totalToImport > 0 ? (
            <div className="flex items-center gap-1.5 text-sm text-success">
              <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
              {totalToImport} bài đọc trong {groups.length} set sẵn sàng để nhập
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Không nhận diện được bài đọc hiểu nào trong nội dung này.</p>
          )}
          {groups.map((group) => (
            <div key={group.label} className="space-y-1">
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {group.label}
                <span className="badge-neutral">{group.rows.length}</span>
                {existingSets.some((s) => s.name === group.label) && (
                  <span className="text-[10px] font-normal normal-case text-muted-foreground">(set có sẵn)</span>
                )}
              </p>
              <ul className="max-h-32 space-y-1 overflow-y-auto text-sm">
                {group.rows.map((row, i) => (
                  <li key={i} className="flex items-baseline gap-2 truncate text-foreground">
                    <span className="shrink-0 font-medium">{row.title}</span>
                    <span className="truncate text-muted-foreground">— {row.questions.length} câu hỏi</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {submitError && <p className="error-text">{submitError}</p>}

      <div className="flex gap-2">
        <button
          type="button"
          disabled={submitting || totalToImport === 0}
          onClick={handleImport}
          className="btn-primary"
        >
          {submitting ? 'Đang nhập…' : totalToImport > 0 ? `Nhập ${totalToImport} bài` : 'Nhập'}
        </button>
        <button type="button" onClick={onCancel} className="btn-outline">
          Hủy
        </button>
      </div>
    </div>
  );
}
