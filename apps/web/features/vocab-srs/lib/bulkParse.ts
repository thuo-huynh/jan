import { vocabEntrySchema } from '@/shared/validation/schemas';

/**
 * Parser for the "bulk add" vocab textarea (paste many words at once,
 * Quizlet-style). One entry per non-empty line. Tab is the primary
 * separator (what pasting from Sheets/Excel/Quizlet's own export produces)
 * and supports an optional middle "reading" column (word / reading /
 * meaning); without a tab, falls back to the first of " - ", " – ", ":", ","
 * found in the line, which only yields word/meaning (no reading column).
 */

export interface ParsedBulkEntry {
  word: string;
  reading: string | null;
  meaning: string;
}

export interface BulkParseError {
  line: number;
  raw: string;
  message: string;
}

export interface BulkParseResult {
  entries: ParsedBulkEntry[];
  errors: BulkParseError[];
}

const FALLBACK_SEPARATORS = [' - ', ' – ', ':', ','];

function splitLine(line: string): { word: string; reading: string | null; meaning: string } | null {
  if (line.includes('\t')) {
    const [word, second, third] = line.split('\t');
    if (third !== undefined) {
      return { word: word.trim(), reading: second.trim() || null, meaning: third.trim() };
    }
    return { word: word.trim(), reading: null, meaning: (second ?? '').trim() };
  }

  for (const sep of FALLBACK_SEPARATORS) {
    const idx = line.indexOf(sep);
    if (idx > 0) {
      return {
        word: line.slice(0, idx).trim(),
        reading: null,
        meaning: line.slice(idx + sep.length).trim(),
      };
    }
  }

  return null;
}

export function parseBulkVocabInput(text: string): BulkParseResult {
  const entries: ParsedBulkEntry[] = [];
  const errors: BulkParseError[] = [];

  const lines = text.split('\n');
  lines.forEach((rawLine, i) => {
    const line = rawLine.trim();
    if (!line) return;

    const split = splitLine(line);
    if (!split) {
      errors.push({
        line: i + 1,
        raw: rawLine,
        message: 'Không tìm thấy dấu phân cách — dùng tab, "-", ":", hoặc "," giữa từ và nghĩa',
      });
      return;
    }

    const parsed = vocabEntrySchema.safeParse({
      word: split.word,
      reading: split.reading,
      meaning: split.meaning,
      example: null,
      jlptLevel: null,
      isKanji: false,
    });
    if (!parsed.success) {
      errors.push({ line: i + 1, raw: rawLine, message: parsed.error.issues[0]?.message ?? 'Mục không hợp lệ' });
      return;
    }

    entries.push({
      word: parsed.data.word,
      reading: parsed.data.reading ?? null,
      meaning: parsed.data.meaning,
    });
  });

  return { entries, errors };
}
