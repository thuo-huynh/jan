/**
 * Weak-area aggregation (T076) — lowest-scoring reading passage type +
 * lowest-accuracy grammar confusable pair, extended with listening and
 * vocab overall accuracy so all four domains named by FR-037
 * ("grammar/vocab/reading/listening") can surface. Matches
 * contracts/api.md's `GET /api/dashboard` `weakAreas` shape
 * (`{ type, label, score }`, score 0-1, lower = weaker) for its two
 * documented types (`reading_passage_type`, `grammar_confusable`);
 * `listening`/`vocab` are additive extensions of the same shape, not a
 * contract deviation (same reasoning as review-queue route's additive
 * fields — see report).
 */

export type WeakAreaType = 'reading_passage_type' | 'grammar_confusable' | 'listening' | 'vocab';

export interface WeakArea {
  type: WeakAreaType;
  label: string;
  score: number;
}

export interface ReadingLogLite {
  passage_type: string | null;
  comprehension_score: number | null;
}

export interface ListeningLogLite {
  comprehension_score: number | null;
}

export interface ReviewLogLite {
  vocab_id: string | null;
  grammar_id: string | null;
  result: 'again' | 'hard' | 'good' | 'easy';
}

export interface ConfusablePairLite {
  id: string;
  grammar_point_id_a: string;
  grammar_point_id_b: string;
}

function accuracyOf(results: ReviewLogLite[]): number | null {
  if (results.length === 0) return null;
  const correct = results.filter((r) => r.result !== 'again').length;
  return correct / results.length;
}

export function weakestReadingPassageType(logs: ReadingLogLite[]): WeakArea | null {
  const byType = new Map<string, { total: number; count: number }>();
  for (const log of logs) {
    if (log.comprehension_score === null) continue;
    const key = log.passage_type?.trim() || 'Unspecified';
    const bucket = byType.get(key) ?? { total: 0, count: 0 };
    bucket.total += log.comprehension_score;
    bucket.count += 1;
    byType.set(key, bucket);
  }
  if (byType.size === 0) return null;

  let weakest: WeakArea | null = null;
  for (const [label, { total, count }] of Array.from(byType.entries())) {
    const score = total / count / 100;
    if (!weakest || score < weakest.score) {
      weakest = { type: 'reading_passage_type', label, score };
    }
  }
  return weakest;
}

export function weakestConfusablePair(
  reviewLogs: ReviewLogLite[],
  pairs: ConfusablePairLite[],
  patternById: Map<string, string>,
): WeakArea | null {
  const byGrammarPoint = new Map<string, ReviewLogLite[]>();
  for (const log of reviewLogs) {
    if (!log.grammar_id) continue;
    const list = byGrammarPoint.get(log.grammar_id) ?? [];
    list.push(log);
    byGrammarPoint.set(log.grammar_id, list);
  }

  let weakest: WeakArea | null = null;
  for (const pair of pairs) {
    const accuracyA = accuracyOf(byGrammarPoint.get(pair.grammar_point_id_a) ?? []);
    const accuracyB = accuracyOf(byGrammarPoint.get(pair.grammar_point_id_b) ?? []);
    const candidates = [accuracyA, accuracyB].filter((a): a is number => a !== null);
    if (candidates.length === 0) continue;

    const score = Math.min(...candidates);
    if (!weakest || score < weakest.score) {
      const patternA = patternById.get(pair.grammar_point_id_a) ?? '?';
      const patternB = patternById.get(pair.grammar_point_id_b) ?? '?';
      weakest = { type: 'grammar_confusable', label: `${patternA} vs ${patternB}`, score };
    }
  }
  return weakest;
}

export function listeningWeakArea(logs: ListeningLogLite[]): WeakArea | null {
  const scored = logs.filter((l): l is { comprehension_score: number } => l.comprehension_score !== null);
  if (scored.length === 0) return null;
  const avg = scored.reduce((sum, l) => sum + l.comprehension_score, 0) / scored.length;
  return { type: 'listening', label: 'Listening comprehension', score: avg / 100 };
}

export function vocabWeakArea(reviewLogs: ReviewLogLite[]): WeakArea | null {
  const vocabLogs = reviewLogs.filter((l) => l.vocab_id);
  const score = accuracyOf(vocabLogs);
  if (score === null) return null;
  return { type: 'vocab', label: 'Vocab/kanji review accuracy', score };
}

/** Filters out domains with no data yet and returns the weakest first (lowest score = weakest). */
export function computeWeakAreas(candidates: (WeakArea | null)[], limit = 3): WeakArea[] {
  return candidates
    .filter((c): c is WeakArea => c !== null)
    .sort((a, b) => a.score - b.score)
    .slice(0, limit);
}
