import { redirect } from 'next/navigation';

/**
 * Legacy redirect stub.
 *
 * The admin sign-in surface moved to the shared `/auth/login` page
 * (customers and admins authenticate through the same form; role is
 * resolved server-side and the user is routed to `/admin` or
 * `/account` after success).
 *
 * This stub preserves old bookmarks, the /admin/login link in the
 * middleware redirect chain, and external documentation by bouncing
 * visitors to the canonical login URL with a pre-filled redirect back
 * to `/admin`.
 */
export default function AdminLoginRedirect() {
  redirect('/auth/login?redirect=/admin');
}
