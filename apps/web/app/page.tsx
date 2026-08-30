import { redirect } from 'next/navigation';
import { getAuthedUser } from '@/shared/supabase/server';

/**
 * Root route sends signed-in users straight to their daily home. Boards are
 * retained as legacy data/routes but are no longer the product landing page.
 */
export default async function RootPage() {
  const user = await getAuthedUser();
  redirect(user ? '/learn/dashboard' : '/login');
}
