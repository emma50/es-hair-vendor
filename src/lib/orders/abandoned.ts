import 'server-only';
import { prisma } from '@/lib/prisma';
import { verifyTransaction } from '@/lib/paystack';
import { logServerError, logServerWarn } from '@/lib/log';

/**
 * Abandoned-order sweep.
 *
 * A PAYSTACK order stays in PENDING until either:
 *   - the `charge.success` / `charge.failed` webhook lands (seconds),
 *   - the customer lands on `/checkout/success` and the reconcile path
 *     runs (seconds to minutes), or
 *   - neither of those happens.
 *
 * Case 3 is a real tail: the customer closes the tab before the
 * redirect back, the webhook call is lost in transit, Paystack's queue
 * has a backlog. Without a cleanup path, the held stock is leaked
 * indefinitely — a malicious (or just forgetful) customer can exhaust
 * a SKU by opening the popup and walking away.
 *
 * This sweep:
 *   - Finds PENDING Paystack orders older than `olderThanMinutes`.
 *   - Re-verifies each with Paystack's REST API. If Paystack says
 *     `success` → promotes to CONFIRMED (amount-match required), same
 *     path as the reconcile helper.
 *   - Otherwise → credits stock back, sets `abandonedAt`, flips status
 *     to CANCELLED. The row is preserved for audit; the admin can see
 *     exactly which charges dropped.
 *
 * Idempotent: a re-run finds no rows to sweep (they're no longer
 * PENDING or they're within the cutoff window).
 *
 * Default cutoff: 30 minutes. Generous enough that a customer who
 * actually completed the popup but had their webhook delayed won't get
 * nuked, strict enough that stock isn't held for hours.
 */
export interface SweepResult {
  considered: number;
  promoted: number;
  cancelled: number;
  errored: number;
}

export async function sweepAbandonedPendingOrders(
  olderThanMinutes = 30,
): Promise<SweepResult> {
  const cutoff = new Date(Date.now() - olderThanMinutes * 60 * 1000);
  const candidates = await prisma.order.findMany({
    where: {
      channel: 'PAYSTACK',
      status: 'PENDING',
      createdAt: { lt: cutoff },
    },
    select: {
      id: true,
      orderNumber: true,
      total: true,
      paymentReference: true,
      stockReleased: true,
      items: {
        select: { productId: true, variantId: true, quantity: true },
      },
    },
    // Cap per-run to keep this bounded on a busy store.
    take: 200,
  });

  const result: SweepResult = {
    considered: candidates.length,
    promoted: 0,
    cancelled: 0,
    errored: 0,
  };

  for (const order of candidates) {
    if (!order.paymentReference) {
      result.errored += 1;
      logServerWarn(
        'orders.sweepAbandoned',
        `order ${order.orderNumber} is PAYSTACK but has no paymentReference`,
      );
      continue;
    }

    try {
      const verified = await verifyTransaction(order.paymentReference);
      const apiStatus = verified.data?.status ?? '';
      const apiKobo = verified.data?.amount ?? -1;
      const apiCurrency = verified.data?.currency ?? '';
      const expectedKobo = Math.round(Number(order.total) * 100);

      if (
        apiStatus === 'success' &&
        apiKobo === expectedKobo &&
        apiCurrency === 'NGN'
      ) {
        // The charge actually went through — promote, don't cancel.
        // Same pattern as the reconcile helper.
        await prisma.order.updateMany({
          where: { id: order.id, status: 'PENDING' },
          data: { status: 'CONFIRMED', paymentStatus: 'paid' },
        });
        result.promoted += 1;
        continue;
      }

      // Not a successful charge (Paystack says failed/abandoned/
      // unfindable, or the amount doesn't match — treat all as
      // "customer never paid"). Credit stock + mark abandoned.
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
          where: { id: order.id, status: 'PENDING' },
          data: {
            status: 'CANCELLED',
            paymentStatus: 'abandoned',
            stockReleased: false,
            abandonedAt: new Date(),
          },
        });
      });
      result.cancelled += 1;
    } catch (error) {
      // A single failing row shouldn't poison the rest of the sweep.
      // Log + continue; next sweep retries.
      result.errored += 1;
      logServerError('orders.sweepAbandoned.row', {
        orderNumber: order.orderNumber,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return result;
}
