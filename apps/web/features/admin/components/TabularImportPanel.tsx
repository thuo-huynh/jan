'use client';

import { useMemo, useRef, useState, type ReactNode } from 'react';
import { AlertCircle, CheckCircle2, ChevronDown, ChevronUp, Copy, Upload } from 'lucide-react';
import { parseTabularText, type TabularFormat } from '@/shared/import/parseTabularImport';

const FORMAT_LABELS: Record<TabularFormat, string> = { csv: 'CSV', markdown: 'Markdown', html: 'HTML' };
const FORMAT_EXTENSIONS: Record<TabularFormat, string> = { csv: '.csv', markdown: '.md', html: '.html,.htm' };

function formatFromFileName(name: string): TabularFormat | null {
  const lower = name.toLowerCase();
  if (lower.endsWith('.csv')) return 'csv';
  if (lower.endsWith('.md') || lower.endsWith('.markdown')) return 'markdown';
  if (lower.endsWith('.html') || lower.endsWith('.htm')) return 'html';
  return null;
}

interface TabularImportPanelProps<T> {
  /** e.g. "từ vựng" / "điểm ngữ pháp" — used in button/status copy. */
  entityLabel: string;
  templates: Record<TabularFormat, string>;
  /** Turns one parsed record into either a ready-to-insert entry or an error message — the caller owns validation/type-coercion for its own entity. */
  mapRecord: (record: Record<string, string>) => { entry: T } | { error: string };
  renderPreview: (entry: T) => ReactNode;
  /** Returns an error message on failure, or null on success. */
  onImport: (entries: T[]) => Promise<string | null>;
  onImported: () => void;
}

/**
 * Shared "paste or upload CSV/Markdown/HTML, preview, import" panel for the
 * admin reference-data bulk-import flows (vocab + grammar) — one column
 * schema per entity expressed in three syntaxes (see
 * shared/import/parseTabularImport.ts's doc comment) instead of three
 * unrelated formats, so there's a single pattern to document and reuse.
 */
export function TabularImportPanel<T>({
  entityLabel,
  templates,
  mapRecord,
  renderPreview,
  onImport,
  onImported,
}: TabularImportPanelProps<T>) {
  const [format, setFormat] = useState<TabularFormat>('csv');
  const [text, setText] = useState('');
  const [showTemplate, setShowTemplate] = useState(false);
  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { entries, errors } = useMemo(() => {
    const { records } = parseTabularText(text, format);
    const okEntries: T[] = [];
    const rowErrors: { row: number; message: string }[] = [];
    records.forEach((record, i) => {
      const result = mapRecord(record);
      if ('entry' in result) okEntries.push(result.entry);
      else rowErrors.push({ row: i + 1, message: result.error });
    });
    return { entries: okEntries, errors: rowErrors };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mapRecord is a fresh closure every render by design (captures caller-local state like set pickers); re-parsing on every render is cheap for admin-tool row counts.
  }, [text, format]);

  function handleFile(file: File) {
    const detected = formatFromFileName(file.name);
    if (detected) setFormat(detected);
    const reader = new FileReader();
    reader.onload = () => setText(String(reader.result ?? ''));
    reader.readAsText(file);
  }

  async function handleCopyTemplate() {
    await navigator.clipboard.writeText(templates[format]);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function handleImport() {
    if (entries.length === 0) return;
    setSubmitting(true);
    setSubmitError(null);
    const error = await onImport(entries);
    setSubmitting(false);
    if (error) {
      setSubmitError(error);
      return;
    }
    setText('');
    onImported();
  }

  return (
    <div className="card space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex gap-1 rounded-lg border border-border bg-muted/40 p-1">
          {(Object.keys(FORMAT_LABELS) as TabularFormat[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFormat(f)}
              aria-pressed={format === f}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                format === f ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {FORMAT_LABELS[f]}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setShowTemplate((v) => !v)} className="btn-outline h-8 px-3 text-xs">
            {showTemplate ? <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" /> : <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />}
            Xem mẫu
          </button>
          <button type="button" onClick={() => fileInputRef.current?.click()} className="btn-outline h-8 px-3 text-xs">
            <Upload className="h-3.5 w-3.5" aria-hidden="true" />
            Tải file lên
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept={`${FORMAT_EXTENSIONS.csv},${FORMAT_EXTENSIONS.markdown},${FORMAT_EXTENSIONS.html}`}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
              e.target.value = '';
            }}
          />
        </div>
      </div>

      {showTemplate && (
        <div className="space-y-1.5 rounded-lg border border-border bg-muted/30 p-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-muted-foreground">Mẫu định dạng {FORMAT_LABELS[format]}</p>
            <button type="button" onClick={handleCopyTemplate} className="btn-ghost h-7 px-2 text-xs">
              <Copy className="h-3 w-3" aria-hidden="true" />
              {copied ? 'Đã chép' : 'Chép'}
            </button>
          </div>
          <pre className="overflow-x-auto whitespace-pre rounded bg-card p-2 text-xs text-foreground">
            {templates[format]}
          </pre>
        </div>
      )}

      <div>
        <label className="label-field" htmlFor="tabular-import-input">
          Dán nội dung {FORMAT_LABELS[format]} vào đây, hoặc tải file lên ở trên
        </label>
        <textarea
          id="tabular-import-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={8}
          placeholder={templates[format]}
          className="textarea-field font-mono text-xs"
        />
      </div>

      {(entries.length > 0 || errors.length > 0) && (
        <div className="space-y-2 rounded-lg border border-border p-3">
          {entries.length > 0 && (
            <div className="flex items-center gap-1.5 text-sm text-success">
              <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
              {entries.length} {entityLabel} sẵn sàng để nhập
            </div>
          )}
          {entries.length > 0 && (
            <ul className="max-h-40 space-y-1 overflow-y-auto text-sm">
              {entries.map((entry, i) => (
                <li key={i} className="truncate text-foreground">
                  {renderPreview(entry)}
                </li>
              ))}
            </ul>
          )}
          {errors.length > 0 && (
            <div className="space-y-1 border-t border-border pt-2">
              <div className="flex items-center gap-1.5 text-sm text-danger">
                <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                {errors.length} dòng không hợp lệ
              </div>
              <ul className="max-h-24 space-y-0.5 overflow-y-auto text-xs text-muted-foreground">
                {errors.map((e) => (
                  <li key={e.row} className="truncate">
                    Dòng {e.row}: {e.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {submitError && <p className="error-text">{submitError}</p>}

      <button type="button" disabled={submitting || entries.length === 0} onClick={handleImport} className="btn-primary">
        {submitting ? 'Đang nhập…' : entries.length > 0 ? `Nhập ${entries.length} ${entityLabel}` : 'Nhập'}
      </button>
    </div>
  );
}
