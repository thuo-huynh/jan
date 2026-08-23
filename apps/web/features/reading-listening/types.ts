/**
 * Row shapes for `public.reading_logs` / `public.listening_logs`
 * (data-model.md "reading_logs" / "listening_logs").
 */
export type ReadingLog = {
  id: string;
  user_id: string;
  source: string;
  passage_type: string | null;
  duration_min: number;
  comprehension_score: number | null;
  notes: string | null;
  practiced_at: string;
};

export type ListeningLog = {
  id: string;
  user_id: string;
  source: string;
  duration_min: number;
  comprehension_score: number | null;
  notes: string | null;
  practiced_at: string;
};

/** Common 読解 passage types (FR-022) — offered as datalist suggestions, not enforced. */
export const PASSAGE_TYPES = ['随筆', '評論', '案内', '物語', '説明文'] as const;

/**
 * A reading-passage-bank passage's body — alternating plain text and
 * annotated vocab terms (specs/004-reading-comprehension/research.md §1).
 * Never rendered via dangerouslySetInnerHTML; each `term` segment is a real
 * component with its own tap/hover popup + attach-to-SRS action.
 */
export type PassageSegment =
  | { type: 'text'; value: string }
  | { type: 'term'; term: string; reading: string; meaning: string };

export interface PassageQuestion {
  id: string;
  orderIndex: number;
  questionText: string;
  /** Always length 4. */
  choices: string[];
  correctChoiceIndex: number;
  explanation: string;
}

export interface ReadingPassage {
  id: string;
  setId: string | null;
  title: string;
  segments: PassageSegment[];
  translationVn: string | null;
  tip: string | null;
  questions: PassageQuestion[];
}

/** A user's own grouping of their reading passages — same concept as GrammarSet/VocabSet (kept snake_case created_at to match those, since a set's shape is trivial enough that it's used directly rather than going through a row->prop mapper). */
export interface ReadingPassageSet {
  id: string;
  name: string;
  created_at: string;
}
