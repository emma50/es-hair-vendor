'use server';

import { prisma } from '@/lib/prisma';
import { emailSubscribeSchema } from '@/lib/validations';
import type { ActionResult } from '@/types';

export async function subscribeEmail(
  formData: FormData,
): Promise<ActionResult<{ email: string }>> {
  const raw = { email: formData.get('email') as string };
  const parsed = emailSubscribeSchema.safeParse(raw);

  if (!parsed.success) {
    return {
      success: false,
      error: 'Invalid email address',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    await prisma.emailSubscriber.upsert({
      where: { email: parsed.data.email },
      update: {},
      create: { email: parsed.data.email },
    });

    return { success: true, data: { email: parsed.data.email } };
  } catch {
    return { success: false, error: 'Something went wrong. Please try again.' };
  }
}
