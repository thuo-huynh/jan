/**
 * Shared types for the grammar tracker feature (US2, T041-T048).
 * Field names are camelCase for component props; the DB row -> prop mapping
 * happens once in `lib/mapGrammarPoint.ts` so components never touch
 * snake_case Supabase rows directly.
 */

export type GrammarStatus = 'not_started' | 'learning' | 'mastered';

export interface ConfusablePairRef {
  pairId: string;
  partnerId: string;
  /** Pattern text of the *other* point in the pair, for badge display. */
  partnerPattern: string;
}

export interface GrammarPointWithProgress {
  id: string;
  pattern: string;
  meaning: string;
  connectionForm: string | null;
  formalityNuance: string | null;
  exampleSentences: string[];
  jlptLevel: string;
  frequencyTag: string | null;
  n3Overlap: boolean;
  /** Implicit 'not_started' when the user has no `user_grammar_status` row yet. */
  status: GrammarStatus;
  notesUser: string | null;
  confusablePairs: ConfusablePairRef[];
}
