import { redirect } from 'next/navigation';
import { createClient, getAuthedUser } from '@/shared/supabase/server';
import { loadLibraryMaterials } from '@/features/learning/lib/summary';
import { LibraryBrowser } from '@/features/learning/components/LibraryBrowser';

export default async function LibraryPage() {
  const supabase = createClient();
  const user = await getAuthedUser();
  if (!user) redirect('/login');

  const materials = await loadLibraryMaterials(supabase, user.id);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="page-heading">Thư viện của bạn</h1>
        <p className="page-intro">
          Tập hợp các bộ từ, điểm ngữ pháp và bài đọc bạn đã tạo hoặc lưu lại.
        </p>
      </div>
      <LibraryBrowser materials={materials} />
    </div>
  );
}
