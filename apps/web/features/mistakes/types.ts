/** Row shape for `public.mistake_notebook` (data-model.md "mistake_notebook"). */
export type MistakeEntry = {
  id: string;
  user_id: string;
  source: 'mock_test' | 'manual';
  content: string;
  linked_vocab_id: string | null;
  linked_grammar_id: string | null;
  resolved: boolean;
  created_at: string;
};

export type VocabLinkOption = { id: string; word: string; meaning: string };
export type GrammarLinkOption = { id: string; pattern: string; meaning: string };
