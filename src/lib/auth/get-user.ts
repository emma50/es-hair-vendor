import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import type { User as AppUser } from '@prisma/client';

/**
 * Result shape for {@link getCurrentUser} — joined Supabase auth session
 * data + application User row (authoritative for role/name/timestamps).
 */
export interface CurrentUser {
  /** Supabase auth user id (UUID). Same value as `appUser.id`. */
  id: string;
  /** Email from Supabase Auth. */
  email: string;
  /** Application User row — source of truth for role, name, createdAt. */
  appUser: AppUser;
}

/**
 * Resolve the currently-authenticated user.
 *
 * Reads the Supabase session from the request cookies, then loads the
 * matching application `User` row (by id, which equals the Supabase
 * auth user id). Returns `null` if there is no session OR if the
 * Supabase user has no application row yet — callers should treat
 * both as "not signed in".
 *
 * Use {@link requireUser} / {@link requireAdmin} when a route or
 * action must reject unauthenticated callers.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createClient();

  // `getUser()` throws (not just returns `{ error }`) when the cached
  // refresh token is missing or invalid — e.g. after a long absence, a
  // sign-out elsewhere, or the recent auth migration that invalidated
  // legacy sessions. Any such failure means "not signed in", so we
  // swallow it and return null. The middleware will clear the stale
  // cookies on the next request.
  let user: Awaited<ReturnType<typeof supabase.auth.getUser>>['data']['user'] =
    null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch {
    return null;
  }

  if (!user?.email) return null;

  // Lookup by id first (the fast path — direct primary-key hit).
  // Fall back to email for the transitional window where an admin
  // provisioned before this migration may still be reachable by email.
  const appUser =
    (await prisma.user.findUnique({ where: { id: user.id } })) ??
    (await prisma.user.findUnique({ where: { email: user.email } }));

  if (!appUser) return null;

  return {
    id: user.id,
    email: user.email,
    appUser,
  };
}
