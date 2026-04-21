import { getCurrentUser, type CurrentUser } from './get-user';

/**
 * Verify that the current request is made by an authenticated admin.
 *
 * Call this as the **first line** of every admin-only server action
 * and admin-only server component that bypasses middleware (e.g.
 * invoked directly by another server module).
 *
 * Why a dedicated helper instead of relying on the middleware alone?
 * Next.js middleware guards page *navigation*, but it does NOT
 * intercept server action invocations. A malicious caller can import
 * any exported server action and invoke it directly — bypassing the
 * middleware entirely. This helper closes that gap by checking the
 * Prisma User row's role on every call.
 *
 * @throws `Error('Unauthorized')` if no valid session or role !== ADMIN.
 */
export async function requireAdmin(): Promise<CurrentUser> {
  const current = await getCurrentUser();
  if (!current || current.appUser.role !== 'ADMIN') {
    throw new Error('Unauthorized');
  }
  return current;
}
