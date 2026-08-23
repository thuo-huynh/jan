import type { PassageSegment } from '../types';

/**
 * `{term|reading|meaning}` inline annotation syntax for the manual
 * passage-creation form (e.g. `{規則|きそく|quy tắc}`) — parsed into the same
 * PassageSegment[] shape parseReadingHtml.ts produces from real markup, so
 * ReadingPassageViewer only ever needs one rendering path
 * (specs/004-reading-comprehension/research.md §3).
 *
 * The term itself is required to sit *inside* the braces too, not just
 * reading/meaning: Japanese text has no whitespace between words, so there is
 * no reliable way to detect where an unbracketed term would start.
 */
const TERM_PATTERN = /\{([^|{}]+)\|([^|{}]*)\|([^{}]+)\}/g;

export function parseInlinePassageSyntax(text: string): PassageSegment[] {
  const segments: PassageSegment[] = [];
  let lastIndex = 0;

  for (const match of Array.from(text.matchAll(TERM_PATTERN))) {
    const [full, term, reading, meaning] = match;
    const index = match.index ?? 0;
    if (index > lastIndex) segments.push({ type: 'text', value: text.slice(lastIndex, index) });
    segments.push({ type: 'term', term: term.trim(), reading: reading.trim(), meaning: meaning.trim() });
    lastIndex = index + full.length;
  }
  if (lastIndex < text.length) segments.push({ type: 'text', value: text.slice(lastIndex) });

  return segments;
}
