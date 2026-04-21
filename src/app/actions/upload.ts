'use server';

import { requireAdmin } from '@/lib/auth/require-admin';
import { generateUploadSignature } from '@/lib/cloudinary';
import type { ActionResult } from '@/types';

export async function getUploadSignature(folder: string): Promise<
  ActionResult<{
    signature: string;
    timestamp: number;
    apiKey: string;
    cloudName: string;
    folder: string;
  }>
> {
  try {
    // Upload signatures let the holder write to Cloudinary on our
    // behalf — gate this to authenticated admins only.
    await requireAdmin();
  } catch {
    return { success: false, error: 'Unauthorized' };
  }

  try {
    const timestamp = Math.round(Date.now() / 1000);
    const paramsToSign = { timestamp: String(timestamp), folder };
    const signature = generateUploadSignature(paramsToSign);

    return {
      success: true,
      data: {
        signature,
        timestamp,
        apiKey: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY!,
        cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!,
        folder,
      },
    };
  } catch {
    return { success: false, error: 'Failed to generate upload signature.' };
  }
}
