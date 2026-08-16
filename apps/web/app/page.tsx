import { redirect } from 'next/navigation';
import { createClient } from '@/shared/supabase/server';

/**
 * Root route: never renders content of its own — sends signed-in users to
 * their board list and everyone else to login. Was left as the unmodified
 * create-next-app scaffold from T001; nothing in the app actually links
 * here, so it went unnoticed until deployment.
 */
export default async function RootPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  redirect(user ? '/boards' : '/login');
}
