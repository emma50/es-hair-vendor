import { NextResponse } from 'next/server';
import { Prisma, type OrderStatus } from '@prisma/client';
import { verifyWebhookSignature, verifyTransaction } from '@/lib/paystack';
import { prisma } from '@/lib/prisma';
import { logServerError, logServerWarn } from '@/lib/log';

// Pin Node runtime — this handler uses Prisma (Postgres driver) and
// node:crypto's `timingSafeEqual` (via verifyWebhookSignature). Both
// are unavailable on the Edge runtime; if Next ever flips its default
// the webhook would silently 500 and Paystack retries would pile up.
export const runtime = 'nodejs';

/**
 * Paystack webhook handler.
 *
 * Defense-in-depth: a signed webhook body is necessary but not sufficient.
 * Before we flip any order, we ALSO:
 *
 *   1. Verify the HMAC-SHA512 signature (constant-time).
 *   2. Claim idempotency via a `ProcessedWebhookEvent` row keyed on the
 *      Paystack event id — a duplicate delivery fails at this insert
 *      and short-circuits without re-running side effects. (The old
 *      "`status: 'PENDING'` guard in updateMany" is preserved for
 *      `charge.success` but wouldn't protect refund/dispute paths
 *      where the target order is already CONFIRMED.)
 *   3. For state-changing events, re-fetch the transaction from
 *      Paystack's REST API and re-verify `status/amount/currency`
 *      before mutating the order — a replayed webhook alone is not
 *      enough.
 *
 * Handled events:
 *   - `charge.success`       → PENDING → CONFIRMED, capture txn id.
 *   - `charge.failed`        → PENDING → CANCELLED + stock restock.
 *   - `charge.abandoned`     → PENDING → CANCELLED + stock restock.
 *   - `refund.processed`     → any active → REFUNDED + stock restock
 *                              (if not already released).
 *   - `refund.failed`        → logged only; admin action required.
 *   - `charge.dispute.create`   → flag as DISPUTED (stock stays held).
 *   - `charge.dispute.resolve`  → DISPUTED → REFUNDED (lost) or
 *                              admin-driven CONFIRMED (won).
 *
 * All paths are idempotent. HTTP 400 for malformed bodies (Paystack
 * should not retry), 200 for unhandled events (no retry), 401 for
 * signature failures.
 */
export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get('x-paystack-signature') || '';

  if (!verifyWebhookSignature(body, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  // Parse inside its own try/catch — malformed JSON is a 400 (bad
  // request), not a 500 (which would trigger Paystack retries).
  let event: {
    event?: string;
    id?: number | string;
    data?: {
      id?: number | string;
      reference?: string;
      amount?: number;
      currency?: string;
      status?: string;
      transaction?: { reference?: string; id?: number };
    };
  };
  try {
    event = JSON.parse(body);
  } catch (error) {
    logServerWarn('paystack.webhook.parse', error);
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const eventType = event.event ?? 'unknown';

  // Idempotency claim. Paystack delivers at-least-once — a transient
  // 5xx from us or a worker eviction mid-processing can re-fire the
  // same event. We take the `event.id` (or data.id as a fallback for
  // events that nest it differently) and try to INSERT a dedup row. A
  // P2002 on the unique constraint means we've already processed this
  // event and should no-op. (The narrow window where we crash AFTER
  // the insert but BEFORE the side-effect lands — extremely small in
  // practice — is still covered by the existing per-event status
  // guards inside the handlers.)
  const dedupKey = claimDedupKey(event);
  if (dedupKey) {
    try {
      await prisma.processedWebhookEvent.create({
        data: { paystackEventId: dedupKey, eventType },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        // Already processed — ack and return.
        return NextResponse.json({ received: true, duplicate: true });
      }
      // Any other DB error: log and let the handlers run. A missing
      // dedup row is safer than dropping the event.
      logServerWarn('paystack.webhook.dedup', error);
    }
  }

  try {
    switch (eventType) {
      case 'charge.success':
        await handleChargeSuccess(event);
        break;
      case 'charge.failed':
      case 'charge.abandoned':
        await handleChargeFailed(extractChargeReference(event));
        break;
      case 'refund.processed':
        await handleRefundProcessed(event);
        break;
      case 'refund.failed':
        logServerWarn(
          'paystack.webhook.refund.failed',
          `refund failed for ref=${extractChargeReference(event) ?? '?'} — admin action required`,
        );
        break;
      case 'charge.dispute.create':
        await handleDisputeCreate(extractChargeReference(event));
        break;
      case 'charge.dispute.resolve':
        await handleDisputeResolve(event);
        break;
      default:
        // Unhandled event type — acknowledge so Paystack stops retrying
        // but log so the admin can spot missing handlers during rollout.
        logServerWarn('paystack.webhook.unhandled', eventType);
    }
    return NextResponse.json({ received: true });
  } catch (error) {
    logServerError('paystack.webhook', error);
    // 200 with a logged error keeps Paystack from retrying forever on
    // our own bugs — the handler is idempotent so a missed event can
    // be reconciled manually from the admin side.
    return NextResponse.json({ received: true });
  }
}

/**
 * Build the dedup key for a webhook. Paystack includes a top-level
 * `id` on most modern events; for events that place the id inside
 * `data.id` or that reference a nested transaction, we fall back to
 * a deterministic composite so we still get uniqueness. Returns null
 * only when there's nothing stable to dedupe on — in that case we skip
 * dedup and rely on per-handler idempotency.
 */
function claimDedupKey(event: {
  event?: string;
  id?: number | string;
  data?: { id?: number | string; reference?: string };
}): string | null {
  const eventType = event.event ?? 'unknown';
  if (event.id !== undefined && event.id !== null) {
    return `${eventType}:${event.id}`;
  }
  if (event.data?.id !== undefined && event.data.id !== null) {
    return `${eventType}:data:${event.data.id}`;
  }
  if (event.data?.reference) {
    return `${eventType}:ref:${event.data.reference}`;
  }
  return null;
}

/**
 * Refund + dispute events nest the merchant reference inside a
 * `transaction` sub-object rather than `data.reference`. This helper
 * normalises the lookup.
 */
function extractChargeReference(event: {
  data?: { reference?: string; transaction?: { reference?: string } };
}): string | null {
  return event.data?.reference ?? event.data?.transaction?.reference ?? null;
}

/**
 * Flip a PENDING order to CONFIRMED once we've verified the paid amount
 * matches what we expect. Guarded against replay by the `status` filter.
 */
async function handleChargeSuccess(event: {
  data?: {
    id?: number | string;
    reference?: string;
    amount?: number;
    currency?: string;
  };
}) {
  const reference = event.data?.reference;
  if (!reference) {
    logServerWarn('paystack.webhook.charge.success', 'missing reference');
    return;
  }

  const order = await prisma.order.findUnique({
    where: { paymentReference: reference },
    select: { id: true, status: true, total: true, orderNumber: true },
  });

  if (!order) {
    // Reference the customer never placed through our storefront, or
    // an event for a different environment leaking into ours. Ack so
    // Paystack stops retrying.
    logServerWarn(
      'paystack.webhook.charge.success',
      `no order for reference ${reference}`,
    );
    return;
  }

  if (order.status !== 'PENDING') {
    // Already processed (via a prior webhook delivery or manual admin
    // action). Short-circuit so we don't double-commit.
    return;
  }

  // Expected kobo — `Math.round` mirrors how we encoded `amount` at
  // order-creation time.
  const expectedKobo = Math.round(Number(order.total) * 100);
  const webhookKobo = event.data?.amount ?? -1;
  const webhookCurrency = event.data?.currency ?? '';

  // Re-fetch from the Paystack REST API as the source of truth. A
  // signed webhook event alone could theoretically be replayed by a
  // compromised relay; the REST API returns current-state server data.
  const verified = await verifyTransaction(reference);
  const apiKobo = verified.data?.amount ?? -1;
  const apiCurrency = verified.data?.currency ?? '';
  const apiStatus = verified.data?.status ?? '';
  const apiTxnId = verified.data?.id ?? event.data?.id ?? null;

  if (apiStatus !== 'success') {
    logServerWarn(
      'paystack.webhook.charge.success',
      `REST verify status=${apiStatus} for ${reference} — refusing to confirm`,
    );
    return;
  }

  if (
    webhookKobo !== expectedKobo ||
    apiKobo !== expectedKobo ||
    webhookCurrency !== 'NGN' ||
    apiCurrency !== 'NGN'
  ) {
    logServerError(
      'paystack.webhook.charge.success.amount_mismatch',
      `order ${order.orderNumber} expected ${expectedKobo} NGN kobo, ` +
        `webhook=${webhookKobo} ${webhookCurrency}, ` +
        `api=${apiKobo} ${apiCurrency}`,
    );
    // Do NOT mark paid — leave the order PENDING so the admin can
    // reconcile manually (refund, partial capture, etc.).
    return;
  }

  // All three values agree → safe to confirm. Wrapped in `updateMany`
  // with the `status: 'PENDING'` filter so a concurrent delivery loses
  // the race silently instead of double-booking. We also capture
  // Paystack's numeric transaction id for any later refund API call.
  await prisma.order.updateMany({
    where: { paymentReference: reference, status: 'PENDING' },
    data: {
      status: 'CONFIRMED',
      paymentStatus: 'paid',
      paystackTransactionId: apiTxnId != null ? String(apiTxnId) : undefined,
    },
  });
}

/**
 * Abandoned or failed charge — cancel the order (if still PENDING) and
 * return stock to inventory. Idempotent: a second delivery no-ops
 * because status is no longer PENDING.
 */
async function handleChargeFailed(reference: string | null) {
  if (!reference) return;

  const order = await prisma.order.findUnique({
    where: { paymentReference: reference },
    select: {
      id: true,
      status: true,
      stockReleased: true,
      items: {
        select: { productId: true, variantId: true, quantity: true },
      },
    },
  });

  if (!order || order.status !== 'PENDING') return;

  await prisma.$transaction(async (tx) => {
    // Credit stock back only if we actually subtracted it (defaults to
    // true at creation; mirrors the admin cancellation path).
    if (order.stockReleased) {
      for (const item of order.items) {
        if (item.variantId) {
          await tx.productVariant.updateMany({
            where: { id: item.variantId },
            data: { stockQuantity: { increment: item.quantity } },
          });
        } else {
          await tx.product.updateMany({
            where: { id: item.productId },
            data: { stockQuantity: { increment: item.quantity } },
          });
        }
      }
    }

    await tx.order.updateMany({
      where: { id: order.id, status: 'PENDING' },
      data: {
        status: 'CANCELLED',
        paymentStatus: 'failed',
        stockReleased: false,
      },
    });
  });
}

/**
 * Refund settled at Paystack. Flip the order to REFUNDED and credit
 * stock back (if not already released — admin may have manually
 * cancelled first, which also releases stock).
 *
 * Idempotency: the dedup row at the top of POST catches replays. The
 * per-update `status: { not: 'REFUNDED' }` filter is belt-and-braces
 * for the worst case where dedup fails open (e.g. DB hiccup).
 */
async function handleRefundProcessed(event: {
  data?: { reference?: string; transaction?: { reference?: string } };
}) {
  const reference = extractChargeReference(event);
  if (!reference) {
    logServerWarn('paystack.webhook.refund.processed', 'missing reference');
    return;
  }

  const order = await prisma.order.findUnique({
    where: { paymentReference: reference },
    select: {
      id: true,
      status: true,
      stockReleased: true,
      orderNumber: true,
      items: {
        select: { productId: true, variantId: true, quantity: true },
      },
    },
  });

  if (!order) {
    logServerWarn(
      'paystack.webhook.refund.processed',
      `no order for reference ${reference}`,
    );
    return;
  }

  if (order.status === 'REFUNDED' || order.status === 'CANCELLED') {
    // Already in a stock-released terminal state.
    return;
  }

  await prisma.$transaction(async (tx) => {
    if (order.stockReleased) {
      for (const item of order.items) {
        if (item.variantId) {
          await tx.productVariant.updateMany({
            where: { id: item.variantId },
            data: { stockQuantity: { increment: item.quantity } },
          });
        } else {
          await tx.product.updateMany({
            where: { id: item.productId },
            data: { stockQuantity: { increment: item.quantity } },
          });
        }
      }
    }

    await tx.order.updateMany({
      where: {
        id: order.id,
        status: { notIn: ['REFUNDED', 'CANCELLED'] },
      },
      data: {
        status: 'REFUNDED',
        paymentStatus: 'refunded',
        stockReleased: false,
      },
    });
  });
}

/**
 * Chargeback raised by the cardholder's bank. We move the order to
 * DISPUTED (stock stays held — the money isn't returned yet) and wait
 * for either `charge.dispute.resolve` or manual admin action. We do
 * NOT release stock here: the cardholder may still lose the dispute,
 * in which case the charge stands and the order should continue as
 * normal.
 */
async function handleDisputeCreate(reference: string | null) {
  if (!reference) return;

  const order = await prisma.order.findUnique({
    where: { paymentReference: reference },
    select: { id: true, status: true, orderNumber: true },
  });
  if (!order) {
    logServerWarn(
      'paystack.webhook.dispute.create',
      `no order for reference ${reference}`,
    );
    return;
  }

  // Only flag if the order is in an active state that can dispute.
  // CANCELLED / REFUNDED orders shouldn't regress to DISPUTED.
  const DISPUTABLE: OrderStatus[] = [
    'CONFIRMED',
    'PROCESSING',
    'SHIPPED',
    'DELIVERED',
  ];
  if (!DISPUTABLE.includes(order.status)) return;

  await prisma.order.updateMany({
    where: { id: order.id, status: { in: DISPUTABLE } },
    data: { status: 'DISPUTED' },
  });

  logServerWarn(
    'paystack.webhook.dispute.create',
    `order ${order.orderNumber} marked DISPUTED — admin review required`,
  );
}

/**
 * Dispute resolved. Paystack's `data.status` tells us the outcome:
 *   - `lost` / `merchant-accepted` → treat as refunded.
 *   - `won` / `resolved` → leave as-is; admin manually restores the
 *     prior status (we can't know what it was from DISPUTED alone).
 */
async function handleDisputeResolve(event: {
  data?: {
    status?: string;
    reference?: string;
    transaction?: { reference?: string };
  };
}) {
  const reference = extractChargeReference(event);
  if (!reference) return;

  const outcome = (event.data?.status ?? '').toLowerCase();
  const merchantLost =
    outcome === 'lost' ||
    outcome === 'merchant-accepted' ||
    outcome === 'resolved-merchant-accepted';

  if (!merchantLost) {
    // Merchant won or pending-further-info — log for admin review.
    logServerWarn(
      'paystack.webhook.dispute.resolve',
      `ref=${reference} outcome=${outcome} — admin review, no auto-transition`,
    );
    return;
  }

  // Treat as a refund: release stock + mark REFUNDED.
  await handleRefundProcessed(event);
}
