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
      <div className="max-w-2xl"><h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Thư viện học tập</h1><p className="mt-2 text-sm leading-6 text-muted-foreground">Một nơi yên tĩnh để quay lại với những tài liệu bạn đã học và tự thêm.</p></div>
      <LibraryBrowser materials={materials} />
    </div>
  );
}
