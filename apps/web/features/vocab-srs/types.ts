/** A user's own Quizlet-style "study set" grouping their custom vocab entries. */
export interface VocabSet {
  id: string;
  name: string;
  created_at: string;
}

/** A published admin-curated deck shown in the learner Flashcard catalog. */
export interface SharedFlashcardDeckSummary {
  id: string;
  title: string;
  description: string | null;
  jlptLevel: string | null;
  labels: string[];
  cardCount: number;
  reviewedCount: number;
}

/** A learner-owned vocabulary set with its ready-to-study card count. */
export interface PersonalFlashcardSetSummary {
  id: string;
  name: string;
  cardCount: number;
}
