import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { sweepAbandonedPendingOrders } from '@/lib/orders/abandoned';
import { logServerError, logServerWarn } from '@/lib/log';

/**
 * Internal cron endpoint for the abandoned-PENDING-order sweep.
 *
 * Auth model: shared-secret header, NOT session auth. Vercel Cron
 * sends `Authorization: Bearer $CRON_SECRET` automatically when the
 * env var is set, using GET. The admin-UI trigger uses POST with the
 * same secret. Both are accepted.
 *
 * What it does: defers to `sweepAbandonedPendingOrders(30)` — re-verify
 * every PENDING Paystack order older than 30 minutes and either
 * promote (paid) or cancel + restock (abandoned).
 */

// Pin Node runtime — the sweep uses Prisma (Postgres driver) and
// node:crypto's `timingSafeEqual` (in checkAuth). Edge runtime has
// neither.
export const runtime = 'nodejs';

// Function timeout — the sweep iterates up to 200 orders × verifyTransaction
// HTTP calls, so the default 10s ceiling will time out under any backlog.
// Vercel.json also pins this for the deployed function config.
export const maxDuration = 60;

function checkAuth(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    // Loud failure: without this, the cron silently 401s forever.
    logServerError(
      'cron.releaseAbandoned.config',
      'CRON_SECRET is not set — cron sweep cannot authenticate',
    );
    return false;
  }

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

async function handle(req: Request) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 30-minute cutoff. Combined with the external 15-min scheduler
    // (cron-job.org), the worst-case stock-hold window is ~45 minutes:
    // an order has to be ≥30 min old AND wait for the next sweep tick.
    // 30 min gives slow customers and delayed webhooks safe headroom.
    const result = await sweepAbandonedPendingOrders(30);
    if (result.errored > 0) {
      logServerWarn('cron.releaseAbandoned', result);
    }
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    logServerError('cron.releaseAbandoned', error);
    return NextResponse.json(
      { ok: false, error: 'Sweep failed' },
      { status: 500 },
    );
  }
}

// Vercel Cron uses GET; admin trigger uses POST. Both are valid.
export const GET = handle;
export const POST = handle;
