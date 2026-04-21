import { prisma } from '@/lib/prisma';
import type { User as AppUser, UserRole } from '@prisma/client';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface SyncOptions {
  /**
   * Name to set on the application User row. Used on first sync (from
   * signup form) — omitted on subsequent calls so the user's edits in
   * `/account/profile` are never stomped by session refreshes.
   */
  name?: string;
  /**
   * Role to assign on first sync. Defaults to CUSTOMER. Only the admin
   * provision script sets this to ADMIN — the signup server action
   * never passes ADMIN.
   */
  role?: UserRole;
}

/**
 * Ensure an application `User` row exists for the given Supabase auth
 * user and return it. The Prisma `User.id` is always equal to the
 * Supabase auth user id (UUID).
 *
 * On first sync (no existing row), creates the row with the caller's
 * requested `name` + `role`. On subsequent syncs, returns the existing
 * row unchanged — the user's profile edits are preserved.
 */
export async function syncUser(
  supabaseUser: SupabaseUser,
  options: SyncOptions = {},
): Promise<AppUser> {
  if (!supabaseUser.email) {
    throw new Error('Supabase user has no email — cannot sync to Prisma User');
  }

  const existing = await prisma.user.findUnique({
    where: { id: supabaseUser.id },
  });
  if (existing) return existing;

  return prisma.user.create({
    data: {
      id: supabaseUser.id,
      email: supabaseUser.email,
      name: options.name ?? null,
      role: options.role ?? 'CUSTOMER',
    },
  });
}
