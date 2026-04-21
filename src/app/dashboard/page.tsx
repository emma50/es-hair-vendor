import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/get-user';

/**
 * Legacy `/dashboard` redirect.
 *
 * The real dashboards now live at `/account` (customers) and
 * `/admin` (administrators). This route is kept only so old
 * bookmarks and external links resolve to the correct destination
 * based on the caller's role.
 */
export default async function DashboardRedirect() {
  const current = await getCurrentUser();

  if (!current) {
    redirect('/auth/login?redirect=/account');
  }

  redirect(current.appUser.role === 'ADMIN' ? '/admin' : '/account');
}
