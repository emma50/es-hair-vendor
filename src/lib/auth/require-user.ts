import { getCurrentUser, type CurrentUser } from './get-user';

/**
 * Verify that the current request comes from ANY authenticated user
 * (customer or admin). Call this as the first line of server actions
 * and server components that must reject anonymous callers but don't
 * care about role.
 *
 * Distinct from `requireAdmin` (which additionally checks role === ADMIN).
 *
 * @throws `Error('Unauthorized')` if the session is missing or the
 *   application User row has not been created yet.
 */
export async function requireUser(): Promise<CurrentUser> {
  const current = await getCurrentUser();
  if (!current) {
    throw new Error('Unauthorized');
  }
  return current;
}
