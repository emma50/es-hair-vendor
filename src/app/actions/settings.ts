'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth/require-admin';
import { storeSettingsSchema } from '@/lib/validations';
import { logServerError } from '@/lib/log';
import type { ActionResult } from '@/types';
import * as Sentry from '@sentry/nextjs';
import { headers } from 'next/headers';

export async function updateStoreSettings(
  formData: Record<string, unknown>,
): Promise<ActionResult> {
  return Sentry.withServerActionInstrumentation(
    'updateStoreSettings',
    { headers: await headers() },
    async (): Promise<ActionResult> => {
      try {
        await requireAdmin();
      } catch {
        return { success: false, error: 'Unauthorized' };
      }

      const parsed = storeSettingsSchema.safeParse(formData);
      if (!parsed.success) {
        return {
          success: false,
          error: 'Please check your form fields.',
          fieldErrors: parsed.error.flatten().fieldErrors,
        };
      }

      try {
        await prisma.storeSettings.upsert({
          where: { id: 'default' },
          update: {
            storeName: parsed.data.storeName,
            storeEmail: parsed.data.storeEmail || null,
            storePhone: parsed.data.storePhone || null,
            whatsappNumber: parsed.data.whatsappNumber || null,
            shippingFee: parsed.data.shippingFee,
            freeShippingMin: parsed.data.freeShippingMin || null,
            announcementBar: parsed.data.announcementBar || null,
            isMaintenanceMode: parsed.data.isMaintenanceMode,
          },
          create: {
            id: 'default',
            storeName: parsed.data.storeName,
            storeEmail: parsed.data.storeEmail || null,
            storePhone: parsed.data.storePhone || null,
            whatsappNumber: parsed.data.whatsappNumber || null,
            shippingFee: parsed.data.shippingFee,
            freeShippingMin: parsed.data.freeShippingMin || null,
            announcementBar: parsed.data.announcementBar || null,
            isMaintenanceMode: parsed.data.isMaintenanceMode,
          },
        });

        // Settings feed the public header (announcement bar, maintenance
        // banner) and checkout (shipping fee). Invalidate everything that
        // could reasonably read from this table so changes surface
        // immediately to shoppers.
        revalidatePath('/', 'layout');
        revalidatePath('/admin/settings');
        return { success: true, data: undefined };
      } catch (error) {
        logServerError('settings.update', error);
        return { success: false, error: 'Failed to update settings.' };
      }
    },
  );
}
