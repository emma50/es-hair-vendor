import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/require-admin';
import { generateUploadSignature } from '@/lib/cloudinary';
import { logServerError } from '@/lib/log';

// Pin Node runtime — Cloudinary's Node SDK + Prisma (transitively via
// requireAdmin) are not Edge-compatible.
export const runtime = 'nodejs';

/**
 * Admin-only Cloudinary signature endpoint.
 *
 * The browser calls this before opening the `CldUploadWidget` in
 * "signed" mode. We authenticate the caller (admin only — customers
 * never upload product imagery) and return a signature bound to the
 * exact `paramsToSign` the client will use. Cloudinary rejects any
 * upload whose payload does not match the signed params, so a client
 * cannot rewrite the destination folder or public_id after the fact.
 *
 * Defence-in-depth: we sign a whitelisted subset of params — even with
 * a compromised admin session, a caller cannot request a signature for
 * an arbitrary destination (e.g. overwriting `eshair/brand/logo`) or
 * trigger an expensive `eager` transformation.
 */

/**
 * Params the widget legitimately needs signed. Any other key is
 * stripped before signing, so an attacker cannot smuggle extra
 * Cloudinary options (invalidate, eager, notification_url, etc.) past
 * us. Keep this list minimal — add to it only when the widget breaks.
 */
const ALLOWED_PARAMS = new Set([
  'timestamp',
  'folder',
  'public_id',
  'upload_preset',
  'source',
]);

/**
 * Only allow uploads under the product-owned folder tree. Blocks a
 * compromised admin session from overwriting the logo or pushing
 * imagery into an unrelated folder.
 */
const ALLOWED_FOLDER_PREFIX = /^eshair\/products(\/|$)/;

export async function POST(req: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (typeof body !== 'object' || body === null) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const rawParams = (body as { paramsToSign?: Record<string, unknown> })
    .paramsToSign;
  if (!rawParams || typeof rawParams !== 'object') {
    return NextResponse.json(
      { error: 'Missing paramsToSign' },
      { status: 400 },
    );
  }

  // Filter + normalise to primitives. `api_sign_request` expects
  // string/number values; reject anything else (objects, arrays, null)
  // rather than silently stringifying them.
  const filtered: Record<string, string> = {};
  for (const [key, value] of Object.entries(rawParams)) {
    if (!ALLOWED_PARAMS.has(key)) continue;
    // Timestamp is set server-side below — ignore client-provided value.
    // Cloudinary rejects signatures whose timestamp is more than 1 hour
    // off; trusting the client's clock means a stale signature could be
    // replayed long after the admin's session ended.
    if (key === 'timestamp') continue;
    if (typeof value !== 'string' && typeof value !== 'number') {
      return NextResponse.json(
        { error: `Invalid value for ${key}` },
        { status: 400 },
      );
    }
    filtered[key] = String(value);
  }
  filtered.timestamp = String(Math.floor(Date.now() / 1000));

  // Confine uploads to the product folder. Public IDs, when explicitly
  // set, must live inside that same prefix so a client can't use
  // `public_id` to write outside it when `folder` is omitted.
  if (filtered.folder && !ALLOWED_FOLDER_PREFIX.test(filtered.folder)) {
    return NextResponse.json(
      { error: 'Folder not permitted' },
      { status: 400 },
    );
  }
  if (filtered.public_id && !ALLOWED_FOLDER_PREFIX.test(filtered.public_id)) {
    return NextResponse.json(
      { error: 'public_id not permitted' },
      { status: 400 },
    );
  }

  try {
    const signature = generateUploadSignature(filtered);
    return NextResponse.json({ signature });
  } catch (error) {
    logServerError('cloudinary.sign', error);
    return NextResponse.json(
      { error: 'Signature generation failed' },
      { status: 500 },
    );
  }
}
