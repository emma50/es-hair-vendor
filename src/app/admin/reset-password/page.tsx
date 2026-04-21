import { redirect } from 'next/navigation';

/**
 * Legacy redirect stub — see `src/app/admin/login/page.tsx`.
 */
export default function AdminResetPasswordRedirect() {
  redirect('/auth/reset-password');
}
