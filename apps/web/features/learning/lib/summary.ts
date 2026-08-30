import { createClient } from '@/shared/supabase/server';

type ServerSupabaseClient = ReturnType<typeof createClient>;

export type LearningCategory = 'vocabulary' | 'grammar' | 'reading' | 'listening';

export interface LibraryMaterial {
  category: LearningCategory;
  title: string;
  description: string;
  itemCount: number;
  href: string;
}

/** Library read model over the existing relational learning tables. */
export async function loadLibraryMaterials(supabase: ServerSupabaseClient, userId: string): Promise<LibraryMaterial[]> {
  const [vocab, grammar, reading, listening] = await Promise.all([
    supabase.from('vocab_sets').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('grammar_sets').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('reading_passage_sets').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('listening_logs').select('id', { count: 'exact', head: true }).eq('user_id', userId),
  ]);

  return [
    { category: 'vocabulary', title: 'Từ vựng', description: 'Các bộ từ và thẻ ôn tập bạn đã thêm.', itemCount: vocab.count ?? 0, href: '/learn/vocab' },
    { category: 'grammar', title: 'Ngữ pháp', description: 'Các mẫu ngữ pháp và ghi chú cá nhân.', itemCount: grammar.count ?? 0, href: '/learn/grammar' },
    { category: 'reading', title: 'Đọc hiểu', description: 'Bài đọc, câu hỏi và tiến độ trả lời.', itemCount: reading.count ?? 0, href: '/learn/reading' },
    { category: 'listening', title: 'Nghe hiểu', description: 'Những buổi nghe và shadowing đã ghi lại.', itemCount: listening.count ?? 0, href: '/learn/listening' },
  ];
}
