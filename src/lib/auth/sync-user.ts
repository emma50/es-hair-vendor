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

export async function syncUser(
  supabaseUser: SupabaseUser,
  options: SyncOptions = {},
): Promise<AppUser> {
  if (!supabaseUser.email) {
    throw new Error('Supabase user has no email — cannot sync');
  }

  const existing = await prisma.user.findUnique({
    where: { id: supabaseUser.id },
  });

  if (existing) {
    return prisma.user.update({
      where: { id: supabaseUser.id },
      data: {
        email: supabaseUser.email,
        name: options.name ?? existing.name,
      },
    });
  }

  const existingAdmin = await prisma.user.findFirst({
    where: { role: 'ADMIN' },
  });

  const role = existingAdmin ? 'CUSTOMER' : 'ADMIN';

  try {
    return await prisma.user.create({
      data: {
        id: supabaseUser.id,
        email: supabaseUser.email,
        name: options.name ?? null,
        role,
      },
    });
  } catch { 
    // fallback if admin constraint fails
    return prisma.user.create({
      data: {
        id: supabaseUser.id,
        email: supabaseUser.email,
        name: options.name ?? null,
        role: 'CUSTOMER',
      },
    });
  }
}
