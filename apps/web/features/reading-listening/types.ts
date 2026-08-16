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
