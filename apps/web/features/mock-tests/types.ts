/** Row shape for `public.mock_test_results` (data-model.md "mock_test_results"). */
export type MockTestResult = {
  id: string;
  user_id: string;
  test_date: string;
  vocab_grammar_score: number | null;
  reading_score: number | null;
  listening_score: number | null;
  total_score: number | null;
  created_at: string;
};
