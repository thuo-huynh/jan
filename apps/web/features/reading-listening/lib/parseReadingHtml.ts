import type { PassageSegment } from '../types';

export interface ParsedReadingQuestion {
  questionText: string;
  /** Always length 4. */
  choices: string[];
  correctChoiceIndex: number;
  explanation: string;
}

export interface ParsedReadingPassage {
  title: string;
  segments: PassageSegment[];
  questions: ParsedReadingQuestion[];
  translationVn: string | null;
  tip: string | null;
  /** Visible label of the source `.tab-btn[data-tab]` the item was found under — used to auto-group an import into one set, same convention as parseGrammarHtml.ts. */
  sourceTabLabel: string | null;
}

const QUESTION_NUMBER = /^問\d+[\s　]*/;

/** `el`'s text content with every descendant matching `selector` removed first (e.g. dropping a nested `.box-label`/`.answer-tag` before reading the "real" text). */
function textWithout(el: Element, selector: string): string {
  const clone = el.cloneNode(true) as Element;
  clone.querySelectorAll(selector).forEach((n) => n.remove());
  return (clone.textContent ?? '').trim();
}

/**
 * Best-effort extractor for a personal grammar-notes HTML page's `.dokkai-item`
 * (reading-comprehension exercise) blocks — the same source format
 * `parseGrammarHtml.ts` already imports from, but for the passages/questions
 * that parser deliberately skips (see its own doc comment). Runs on
 * `DOMParser`, a browser-only API — only ever call this from a `'use client'`
 * component (ReadingHtmlImportForm), never at module scope or from server
 * code.
 */
export function parseReadingHtml(html: string): ParsedReadingPassage[] {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const passages: ParsedReadingPassage[] = [];

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

  doc.querySelectorAll('.dokkai-item').forEach((item) => {
    const titleEl = item.querySelector('.dokkai-header span');
    const title = (titleEl?.textContent ?? '').trim();

    const passageBox = item.querySelector('.passage-box');
    if (!title || !passageBox) return;

    const segments: PassageSegment[] = [];
    passageBox.childNodes.forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const value = node.textContent ?? '';
        if (value) segments.push({ type: 'text', value });
        return;
      }
      if (node.nodeType !== Node.ELEMENT_NODE) return;
      const el = node as Element;
      if (el.classList.contains('keigo-term')) {
        const term = (el.textContent ?? '').trim();
        const reading = el.getAttribute('data-jp') ?? '';
        const meaning = el.getAttribute('data-vn') ?? '';
        if (term) segments.push({ type: 'term', term, reading, meaning });
        return;
      }
      const value = el.textContent ?? '';
      if (value) segments.push({ type: 'text', value });
    });
    if (segments.length === 0) return;

    const questions: ParsedReadingQuestion[] = [];
    item.querySelectorAll('.question-box').forEach((qBox) => {
      const qTextEl = qBox.querySelector('.q-text');
      const questionText = (qTextEl?.textContent ?? '').trim().replace(QUESTION_NUMBER, '');

      const choiceEls = Array.from(qBox.querySelectorAll('.choices > li'));
      const choices = choiceEls.map((li) => textWithout(li, '.answer-tag'));
      const correctChoiceIndex = choiceEls.findIndex((li) => li.classList.contains('correct-choice'));

      const explainEl = qBox.querySelector('.explain-box');
      const explanation = explainEl ? textWithout(explainEl, '.box-label') : '';

      if (questionText && choices.length === 4 && correctChoiceIndex >= 0 && explanation) {
        questions.push({ questionText, choices, correctChoiceIndex, explanation });
      }
    });
    if (questions.length === 0) return;

    const translateEl = item.querySelector('.translate-box');
    const translationVn = translateEl ? textWithout(translateEl, '.box-label') || null : null;

    const tipEl = item.querySelector('.tip-box');
    const tip = tipEl ? textWithout(tipEl, '.box-label') || null : null;

    passages.push({
      title,
      segments,
      questions,
      translationVn,
      tip,
      sourceTabLabel: sourceTabLabelFor(item),
    });
  });

  return passages;
}
