import type { PassageSegment } from '../types';
import { parseReadingHtml, type ParsedReadingPassage } from './parseReadingHtml';

export type ReadingImportFormat = 'html' | 'markdown' | 'csv';

function textPassage(title: string, body: string, sourceTabLabel: string | null = null): ParsedReadingPassage | null {
  const value = body.trim();
  if (!title.trim() || !value) return null;
  const segments: PassageSegment[] = [{ type: 'text', value }];
  return { title: title.trim(), segments, questions: [], translationVn: null, tip: null, sourceTabLabel };
}

function csvCells(line: string): string[] {
  const cells: string[] = [];
  let cell = '';
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"' && line[index + 1] === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === ',' && !quoted) {
      cells.push(cell.trim());
      cell = '';
    } else {
      cell += char;
    }
  }
  cells.push(cell.trim());
  return cells;
}

function parseCsv(content: string): ParsedReadingPassage[] {
  const rows = content.split(/\r?\n/).filter((line) => line.trim());
  if (rows.length < 2) return [];
  const headers = csvCells(rows[0]).map((header) => header.toLowerCase().trim());
  const titleIndex = headers.findIndex((header) => ['title', 'tiêu đề', 'tieu de'].includes(header));
  const contentIndex = headers.findIndex((header) => ['content', 'body', 'nội dung', 'noi dung', 'passage'].includes(header));
  const setIndex = headers.findIndex((header) => ['set', 'folder', 'nhóm', 'nhom'].includes(header));
  if (titleIndex < 0 || contentIndex < 0) return [];

  return rows.slice(1).flatMap((row) => {
    const cells = csvCells(row);
    const parsed = textPassage(cells[titleIndex] ?? '', cells[contentIndex] ?? '', cells[setIndex] || null);
    return parsed ? [parsed] : [];
  });
}

function parseMarkdown(content: string): ParsedReadingPassage[] {
  const chunks = content.split(/^#\s+(.+)$/m);
  if (chunks.length === 1) return textPassage('Bài đọc chưa đặt tên', content) ? [textPassage('Bài đọc chưa đặt tên', content)!] : [];

  const passages: ParsedReadingPassage[] = [];
  for (let index = 1; index < chunks.length; index += 2) {
    const parsed = textPassage(chunks[index], chunks[index + 1] ?? '');
    if (parsed) passages.push(parsed);
  }
  return passages;
}

function parseGenericHtml(content: string): ParsedReadingPassage[] {
  const doc = new DOMParser().parseFromString(content, 'text/html');
  const title = doc.querySelector('h1')?.textContent?.trim() || doc.title || 'Bài đọc chưa đặt tên';
  const body = doc.querySelector('article, main')?.textContent ?? doc.body.textContent ?? '';
  const parsed = textPassage(title, body);
  return parsed ? [parsed] : [];
}

/** Converts a personal HTML, Markdown, or CSV source into safe text passages. */
export function parseReadingImport(content: string, format: ReadingImportFormat): ParsedReadingPassage[] {
  if (format === 'csv') return parseCsv(content);
  if (format === 'markdown') return parseMarkdown(content);
  return parseReadingHtml(content).length > 0 ? parseReadingHtml(content) : parseGenericHtml(content);
}
