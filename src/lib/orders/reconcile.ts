import 'server-only';
import { prisma } from '@/lib/prisma';
import { verifyTransaction } from '@/lib/paystack';
import { logServerError, logServerWarn } from '@/lib/log';

/**
 * Reconcile a PENDING Paystack order on the success page.
 *
 * Why this exists:
 * The Paystack webhook (`/api/webhooks/paystack`) is the authoritative
 * confirmation path — it runs the same defense-in-depth checks
 * (signature, REST re-verify, amount/currency agreement) and flips the
 * order to CONFIRMED. But webhook delivery is asynchronous; the customer
 * can land on `/checkout/success` a fraction of a second after
 * `onSuccess` fires, before the webhook has reached us. Telling them
 * "Thank You!" while the order still shows PENDING is at best
 * confusing, at worst a window in which they double-pay.
 *
 * This helper closes that gap without duplicating the webhook's
 * authority: it re-fetches the transaction from the Paystack REST API
 * as the source of truth and, if the amount/currency match what we
 * have on file, flips the order to CONFIRMED. If anything looks off
 * (mismatched amount, still-pending Paystack status, network error)
 * we leave the order PENDING and let the webhook path handle it.
 *
 * Caller contract:
 *   - Pass the order as returned from a `findUnique`/`findFirst` on
 *     `accessToken`. We do not re-read it; the caller already paid for
 *     that round-trip.
 *   - The returned status is what the UI should display. It is always
 *     at least as up-to-date as the input (may be promoted PENDING →
 *     CONFIRMED / CANCELLED).
 */
interface ReconcilableOrder {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string | null;
  paymentReference: string | null;
  channel: string;
  total: unknown; // Prisma Decimal
}

export interface ReconcileResult {
  status: string;
  paymentStatus: string | null;
}

export async function reconcilePendingPaystackOrder(
  order: ReconcilableOrder,
): Promise<ReconcileResult> {
  // Only reconcile Paystack PENDING orders. Anything else is already
  // in its terminal state or doesn't have a Paystack reference to
  // verify against.
  if (
    order.channel !== 'PAYSTACK' ||
    order.status !== 'PENDING' ||
    !order.paymentReference
  ) {
    return { status: order.status, paymentStatus: order.paymentStatus };
  }

  try {
    const verified = await verifyTransaction(order.paymentReference);
    const apiStatus = verified.data?.status ?? '';
    const apiKobo = verified.data?.amount ?? -1;
    const apiCurrency = verified.data?.currency ?? '';
    const expectedKobo = Math.round(Number(order.total) * 100);

    if (apiStatus === 'success') {
      // Same amount/currency invariant enforced here as in the webhook
      // — if Paystack tells us the charge succeeded for a different
      // amount than we charged, do NOT promote the order.
      if (apiKobo !== expectedKobo || apiCurrency !== 'NGN') {
        logServerError(
          'orders.reconcile.paystack.amount_mismatch',
          `order ${order.orderNumber} expected ${expectedKobo} NGN kobo, ` +
            `api=${apiKobo} ${apiCurrency}`,
        );
        return { status: order.status, paymentStatus: order.paymentStatus };
      }

      // Conditional promote. If the webhook raced us and won, this is
      // a no-op (count=0) and we fall through to the post-update read.
      await prisma.order.updateMany({
        where: { id: order.id, status: 'PENDING' },
        data: { status: 'CONFIRMED', paymentStatus: 'paid' },
      });
      return { status: 'CONFIRMED', paymentStatus: 'paid' };
    }

    // Paystack says the charge has not succeeded. Leave the order
    // PENDING — the webhook owns failure-path state transitions.
    return { status: order.status, paymentStatus: order.paymentStatus };
  } catch (error) {
    // A failed verify call (network, 5xx, etc.) is non-fatal: the
    // webhook will still reconcile. Surface the original status so the
    // UI shows "being confirmed" rather than pretending we confirmed.
    logServerWarn('orders.reconcile.paystack', error);
    return { status: order.status, paymentStatus: order.paymentStatus };
  }
}
