export interface ParsedGrammarRow {
  pattern: string;
  meaning: string;
  exampleSentences: string[];
}

/**
 * Best-effort extractor for a personal grammar-notes HTML page (e.g. a
 * hand-built study doc with tables of patterns) — pulls every table row
 * shaped like `<td class="pattern">…</td>` (+ optional context cells, +
 * an optional `<td class="example">` holding `.jp-line`/`.vn-line`) into a
 * flat list of candidate grammar points. This one CSS-class convention is
 * shared across otherwise differently-laid-out tables (2, 3, and 4-column
 * variants all appear in real source docs), so pasting a whole multi-tab
 * document only needs to match this one row shape rather than a rigid
 * single-table layout. Rows without a `.pattern` cell (prose, vocab tables,
 * reading-comprehension quizzes) are silently skipped — this is a
 * best-effort import, not a full-document parser; anything it misses can
 * still be added by hand via the single-entry form (GrammarPointForm).
 *
 * Runs on `DOMParser`, a browser-only API — only ever call this from a
 * `'use client'` component (GrammarHtmlImportForm), never at module scope
 * or from server code.
 */
export function parseGrammarHtml(html: string): ParsedGrammarRow[] {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const rows: ParsedGrammarRow[] = [];
  const seen = new Set<string>();

  doc.querySelectorAll('tr').forEach((tr) => {
    const patternCell = tr.querySelector('td.pattern');
    if (!patternCell) return;

    const pattern = (patternCell.textContent ?? '').replace(/\s+/g, ' ').trim();
    if (!pattern || seen.has(pattern)) return;

    const exampleCell = tr.querySelector('td.example');
    const otherCells = Array.from(tr.querySelectorAll('td')).filter(
      (td) => td !== patternCell && td !== exampleCell,
    );

    const meaningParts = otherCells
      .map((td) => (td.textContent ?? '').replace(/\s+/g, ' ').trim())
      .filter(Boolean);

    let exampleSentences: string[] = [];
    if (exampleCell) {
      const jpLine = exampleCell.querySelector('.jp-line')?.textContent?.trim();
      const vnLine = exampleCell.querySelector('.vn-line')?.textContent?.trim();
      if (jpLine) exampleSentences = [jpLine];
      if (vnLine) meaningParts.push(vnLine);
    }

    seen.add(pattern);
    rows.push({ pattern, meaning: meaningParts.join(' — ') || pattern, exampleSentences });
  });

  return rows;
}
