export interface ParsedGrammarRow {
  pattern: string;
  meaning: string;
  exampleSentences: string[];
  /** Visible label of the tab this row was found under (from a `.tab-btn[data-tab]` matching the row's nearest `.tab-panel` ancestor), or null if the pasted markup has no tab wrapper. Used to auto-group an import into one set per source tab. */
  sourceTabLabel: string | null;
  /** 'note' for a `.note`/`.tip-box` block (general advice, not tied to one pattern) pulled in alongside the real pattern rows — GrammarHtmlImportForm renders these distinctly in the preview. */
  kind: 'pattern' | 'note';
}

const NOTE_SELECTOR = '.note, .tip-box';

/**
 * Best-effort extractor for a personal grammar-notes HTML page (e.g. a
 * hand-built study doc with tables of patterns) — pulls two kinds of
 * content into a flat list of candidate grammar points:
 *
 * 1. Every table row shaped like `<td class="pattern">…</td>` (+ optional
 *    context cells, + an optional `<td class="example">` holding
 *    `.jp-line`/`.vn-line`). This one CSS-class convention is shared across
 *    otherwise differently-laid-out tables (2, 3, and 4-column variants all
 *    appear in real source docs), so pasting a whole multi-tab document
 *    only needs to match this one row shape rather than a rigid
 *    single-table layout.
 * 2. Every `.note`/`.tip-box` block (general tips/mnemonics that span
 *    several patterns, e.g. "Mẹo phân biệt nhanh: …") — these aren't tied
 *    to one row, so each becomes its own point labeled after the nearest
 *    `.group-card` heading (`h2`/`.cat-title`) it's found under, falling
 *    back to the source tab's own label. Notes nested inside `.dokkai-item`
 *    (reading-comprehension exercises) are skipped — those are
 *    reading-strategy tips tied to a specific passage, not general grammar
 *    reference material.
 *
 * Content that matches neither shape (prose, vocab tables, the
 * reading-comprehension passages/quizzes themselves) is silently skipped —
 * this is a best-effort import, not a full-document parser; anything it
 * misses can still be added by hand via the single-entry form
 * (GrammarPointForm).
 *
 * Runs on `DOMParser`, a browser-only API — only ever call this from a
 * `'use client'` component (GrammarHtmlImportForm), never at module scope
 * or from server code.
 */
export function parseGrammarHtml(html: string): ParsedGrammarRow[] {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const rows: ParsedGrammarRow[] = [];
  const seenPatterns = new Set<string>();
  const seenNotes = new Set<string>();

  // Map each tab-panel id to its button's visible label (e.g.
  // <button class="tab-btn" data-tab="so-sanh">Mẫu so sánh</button> ->
  // { "so-sanh": "Mẫu so sánh" }), so a row nested inside
  // <div id="so-sanh" class="tab-panel"> can be traced back to a
  // human-readable tab name for grouping.
  const tabLabelById = new Map<string, string>();
  doc.querySelectorAll<HTMLElement>('[data-tab]').forEach((btn) => {
    const tabId = btn.dataset.tab;
    const label = (btn.textContent ?? '').trim();
    if (tabId && label) tabLabelById.set(tabId, label);
  });

  function sourceTabLabelFor(el: Element): string | null {
    const panel = el.closest('.tab-panel[id]');
    const panelId = panel?.id;
    return panelId ? (tabLabelById.get(panelId) ?? null) : null;
  }

  doc.querySelectorAll('tr').forEach((tr) => {
    const patternCell = tr.querySelector('td.pattern');
    if (!patternCell) return;

    const pattern = (patternCell.textContent ?? '').replace(/\s+/g, ' ').trim();
    if (!pattern || seenPatterns.has(pattern)) return;

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

    seenPatterns.add(pattern);
    rows.push({
      pattern,
      meaning: meaningParts.join(' — ') || pattern,
      exampleSentences,
      sourceTabLabel: sourceTabLabelFor(tr),
      kind: 'pattern',
    });
  });

  doc.querySelectorAll(NOTE_SELECTOR).forEach((note) => {
    if (note.closest('.dokkai-item')) return;

    const meaning = (note.textContent ?? '').replace(/\s+/g, ' ').trim();
    if (!meaning || seenNotes.has(meaning)) return;

    const groupHeading = note
      .closest('.group-card')
      ?.querySelector('h2, .cat-title')
      ?.textContent?.replace(/\s+/g, ' ')
      .trim();
    const label = groupHeading || sourceTabLabelFor(note) || 'Ghi chú';

    seenNotes.add(meaning);
    rows.push({
      pattern: `Ghi chú — ${label}`,
      meaning,
      exampleSentences: [],
      sourceTabLabel: sourceTabLabelFor(note),
      kind: 'note',
    });
  });

  return rows;
}
