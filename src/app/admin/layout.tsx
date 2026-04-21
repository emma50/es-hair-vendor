import type { ReactNode } from 'react';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/get-user';
import { AdminLayoutShell } from '@/components/layout/AdminLayoutShell';

/**
 * Admin route group layout.
 *
 * Two-layer defence for the `/admin/*` surface:
 *
 *   1. `src/middleware.ts` (Edge) redirects anonymous visitors to
 *      `/auth/login?redirect=<path>` before this layout ever runs.
 *      The middleware cannot check the Prisma role column (Prisma
 *      does not execute in Edge runtime), so it only enforces the
 *      anonymous-vs-authenticated boundary.
 *
 *   2. This layout (Node runtime) performs the role check against
 *      the application `User` row. Non-admins are bounced to their
 *      own `/account` dashboard rather than thrown an error — it's
 *      the friendliest UX when a customer fat-fingers an admin URL.
 *
 * The legacy `/admin/login`, `/admin/forgot-password`, and
 * `/admin/reset-password` routes live outside the `/admin` group
 * (they're declared as redirect stubs at the top level), so they
 * never reach the role guard below.
 */
export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  // `x-full-path` is injected by `src/middleware.ts`. Fallback to a
  // safe default if the middleware layer did not run (e.g. during
  // local debugging that bypasses middleware).
  const headerList = await headers();
  const fullPath = headerList.get('x-full-path') || '/admin';
  const loginRedirect = `/auth/login?redirect=${encodeURIComponent(fullPath)}`;

  // Network/DB blips inside `getCurrentUser` should not surface as
  // a raw 500. Treat any failure as "not signed in" and bounce to
  // login — the middleware will re-validate the session on the
  // next request.
  let current: Awaited<ReturnType<typeof getCurrentUser>> = null;
  try {
    current = await getCurrentUser();
  } catch {
    redirect(loginRedirect);
  }

  if (!current) {
    redirect(loginRedirect);
  }

  if (current.appUser.role !== 'ADMIN') {
    redirect('/account');
  }

  return <AdminLayoutShell>{children}</AdminLayoutShell>;
}
