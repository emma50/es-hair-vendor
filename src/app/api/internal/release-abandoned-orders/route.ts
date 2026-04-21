import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { sweepAbandonedPendingOrders } from '@/lib/orders/abandoned';
import { logServerError } from '@/lib/log';

/**
 * Internal cron endpoint for the abandoned-PENDING-order sweep.
 *
 * Auth model: shared-secret header, NOT session auth. An admin UI
 * trigger exists separately (see the admin orders page); this route
 * is for Vercel Cron / an external scheduler to poke.
 *
 * Header: `Authorization: Bearer $CRON_SECRET`
 *
 * Why the separate secret (vs. just reusing the admin session): a
 * scheduler doesn't have a session, and we don't want to issue a
 * long-lived admin cookie for a machine. A dedicated secret also lets
 * you rotate cron access without logging every admin out.
 *
 * What it does: defers to `sweepAbandonedPendingOrders(30)` — re-verify
 * every PENDING Paystack order older than 30 minutes and either
 * promote (paid) or cancel + restock (abandoned).
 */
function checkAuth(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const header = req.headers.get('authorization') ?? '';
  const prefix = 'Bearer ';
  if (!header.startsWith(prefix)) return false;
  const provided = header.slice(prefix.length);

  // Constant-time compare — a naive `===` leaks the first mismatching
  // byte's position under timing analysis.
  const a = Buffer.from(provided);
  const b = Buffer.from(secret);
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await sweepAbandonedPendingOrders(30);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    logServerError('cron.releaseAbandoned', error);
    return NextResponse.json(
      { ok: false, error: 'Sweep failed' },
      { status: 500 },
    );
  }
}
