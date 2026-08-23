/**
 * Generic tabular-data parsing shared by every admin bulk-import panel
 * (reference-data vocab/grammar, and any future one) — one column schema per
 * entity, expressible in three interchangeable syntaxes so there's a single
 * "format pattern" to document instead of three unrelated ones. Each parser
 * only turns raw text into rows of strings; entity-specific validation and
 * type coercion happens one layer up (see TabularImportPanel.tsx).
 */

export type TabularFormat = 'csv' | 'markdown' | 'html';

/** RFC4180-ish CSV line splitter — handles quoted fields containing commas, newlines, and escaped ("") quotes, which a naive `line.split(',')` cannot. */
export function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  let i = 0;

  while (i < text.length) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += char;
      i += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (char === ',') {
      row.push(field);
      field = '';
      i += 1;
      continue;
    }
    if (char === '\r') {
      i += 1;
      continue;
    }
    if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      i += 1;
      continue;
    }
    field += char;
    i += 1;
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((r) => !(r.length === 1 && r[0].trim() === ''));
}

const MARKDOWN_SEPARATOR_ROW = /^\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?$/;

/** Splits a GitHub-flavored-markdown table into rows, skipping the `|---|---|` alignment row. */
export function parseMarkdownTableRows(text: string): string[][] {
  const rows: string[][] = [];
  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim();
    if (!line) continue;
    if (MARKDOWN_SEPARATOR_ROW.test(line)) continue;
    const cells = line
      .replace(/^\|/, '')
      .replace(/\|$/, '')
      .split('|')
      .map((c) => c.trim());
    rows.push(cells);
  }
  return rows;
}

/** Reads the first `<table>` found in a pasted HTML fragment. Browser-only (DOMParser) — only ever call from a `'use client'` component. */
export function parseHtmlTableRows(html: string): string[][] {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const table = doc.querySelector('table');
  if (!table) return [];
  return Array.from(table.querySelectorAll('tr')).map((tr) =>
    Array.from(tr.querySelectorAll('th, td')).map((cell) => (cell.textContent ?? '').trim()),
  );
}

/** First row = column headers (trimmed as-is, case-sensitive — templates document the exact expected names); every following row becomes one record keyed by those headers. */
export function rowsToRecords(rows: string[][]): { headers: string[]; records: Record<string, string>[] } {
  if (rows.length === 0) return { headers: [], records: [] };
  const headers = rows[0].map((h) => h.trim());
  const records = rows.slice(1).map((row) => {
    const record: Record<string, string> = {};
    headers.forEach((h, i) => {
      record[h] = (row[i] ?? '').trim();
    });
    return record;
  });
  return { headers, records };
}

export function parseTabularText(
  text: string,
  format: TabularFormat,
): { headers: string[]; records: Record<string, string>[] } {
  if (!text.trim()) return { headers: [], records: [] };
  const rows =
    format === 'csv'
      ? parseCsvRows(text)
      : format === 'markdown'
        ? parseMarkdownTableRows(text)
        : parseHtmlTableRows(text);
  return rowsToRecords(rows);
}

/** Best-effort boolean coercion for a CSV/MD/HTML cell — accepts the common truthy spellings a non-technical content preparer might type. */
export function parseBooleanCell(value: string | undefined): boolean {
  if (!value) return false;
  return ['true', '1', 'yes', 'có', 'co', 'x'].includes(value.trim().toLowerCase());
}
