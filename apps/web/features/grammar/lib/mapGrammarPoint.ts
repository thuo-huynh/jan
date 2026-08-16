import type { ConfusablePairRef, GrammarPointWithProgress, GrammarStatus } from '../types';

/** Shape of a row selected from `grammar_points` (snake_case, as returned by Supabase). */
export interface GrammarPointRecord {
  id: string;
  pattern: string;
  meaning: string;
  connection_form: string | null;
  formality_nuance: string | null;
  example_sentences: string[] | null;
  jlpt_level: string;
  frequency_tag: string | null;
  n3_overlap: boolean;
}

/** Shape of a row selected from `user_grammar_status` (only the fields the UI needs). */
export interface UserGrammarStatusRecord {
  grammar_point_id: string;
  status: string;
  notes_user: string | null;
}

/**
 * Combines a global `grammar_points` row with the current user's (possibly
 * absent) `user_grammar_status` row into the camelCase shape components use.
 * A missing status row means the point is implicitly `not_started` with no
 * notes — see data-model.md "user_grammar_status" (lazy row creation).
 */
export function mapGrammarPoint(
  point: GrammarPointRecord,
  status: UserGrammarStatusRecord | undefined,
  confusablePairs: ConfusablePairRef[] = [],
): GrammarPointWithProgress {
  return {
    id: point.id,
    pattern: point.pattern,
    meaning: point.meaning,
    connectionForm: point.connection_form,
    formalityNuance: point.formality_nuance,
    exampleSentences: point.example_sentences ?? [],
    jlptLevel: point.jlpt_level,
    frequencyTag: point.frequency_tag,
    n3Overlap: point.n3_overlap,
    status: (status?.status as GrammarStatus | undefined) ?? 'not_started',
    notesUser: status?.notes_user ?? null,
    confusablePairs,
  };
}
