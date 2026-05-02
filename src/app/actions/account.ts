'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth/require-user';
import { updateProfileSchema } from '@/lib/validations';
import type { ActionResult } from '@/types';
import * as Sentry from '@sentry/nextjs';
import { headers } from 'next/headers';

/**
 * Update the display name (and optionally the email) on the signed-in
 * user's account.
 *
 * Email changes route through Supabase Auth so a confirmation email is
 * sent to the new address — until the customer clicks the confirmation
 * link, the Supabase email stays unchanged. We mirror Supabase's
 * authoritative email onto our Prisma row only after the update
 * succeeds to keep both in sync.
 */
export async function updateProfile(
  formData: Record<string, unknown>,
): Promise<ActionResult> {
  return Sentry.withServerActionInstrumentation(
    'updateProfile',
    { headers: await headers() },
    async (): Promise<ActionResult> => {
      const current = await requireUser().catch(() => null);
      if (!current) return { success: false, error: 'Unauthorized' };

      const parsed = updateProfileSchema.safeParse(formData);
      if (!parsed.success) {
        return {
          success: false,
          error: 'Please check your form fields.',
          fieldErrors: parsed.error.flatten().fieldErrors,
        };
      }

      const emailChanged =
        parsed.data.email.toLowerCase() !== current.email.toLowerCase();

      if (emailChanged) {
        const supabase = await createClient();
        const { error } = await supabase.auth.updateUser({
          email: parsed.data.email,
        });
        if (error) return { success: false, error: error.message };
        // The Prisma row's email stays unchanged until Supabase confirms —
        // don't write it here. The next login or session refresh + sync
        // will pick up the new email once confirmed.
      }

      await prisma.user.update({
        where: { id: current.id },
        data: { name: parsed.data.name },
      });

      revalidatePath('/account');
      revalidatePath('/account/profile');

      return { success: true, data: undefined };
    },
  );
}
