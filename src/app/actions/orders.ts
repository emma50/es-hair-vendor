'use server';

import { randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth/require-admin';
import { getCurrentUser } from '@/lib/auth/get-user';
import {
  checkoutFormSchema,
  orderStatusUpdateSchema,
  orderNotesUpdateSchema,
  orderRefundSchema,
  cartItemsArraySchema,
} from '@/lib/validations';
import { refundTransaction } from '@/lib/paystack';
import { sweepAbandonedPendingOrders } from '@/lib/orders/abandoned';
import { formatOrderNumber } from '@/lib/formatters';
import { lagosStartOfDay } from '@/lib/time';
import {
  canTransition,
  holdsStock,
  type OrderStatus,
} from '@/lib/order-state';
import { logServerError } from '@/lib/log';
import type { ActionResult } from '@/types';

interface CartItemInput {
  productId: string;
  variantId: string | null;
  quantity: number;
}

interface CreateOrderResult {
  orderNumber: string;
  accessToken: string;
  paymentReference: string;
  amount: number;
  email: string;
}

/**
 * Name of the HTTP-only cookie that stores the most recent order's
 * access token for anonymous customers. The success page reads this
 * as a fallback when the `t` query parameter is missing (e.g. the
 * customer reloaded the success URL on a fresh tab after Paystack
 * redirected them).
 */
const ORDER_TOKEN_COOKIE = 'esh-order-token';

function generateOrderAccessToken() {
  return randomBytes(32).toString('base64url');
}

/**
 * Merchant-side Paystack payment reference. 128 bits of crypto random
 * so collisions across the whole lifetime of the store are
 * astronomically unlikely; prefixed with `ESH-` so it's immediately
 * recognisable in Paystack's dashboard.
 *
 * The old format `ESH-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
 * gave only ~30 bits of non-crypto entropy and was predictable enough
 * to brute-force against a known issuance window — a crafted reference
 * could collide with a real pending order if the attacker guessed the
 * timestamp right. `paymentReference` is now also `@unique` in Prisma,
 * so even in the adversarial case a collision fails closed (P2002)
 * instead of quietly attaching to someone else's charge.
 */
function generatePaymentReference() {
  return `ESH-${randomBytes(16).toString('hex')}`;
}

/**
 * Lifetime of the anonymous capability token baked into the success
 * page URL (`/checkout/success?t=…`). 30 days matches how long a user
 * might reasonably come back to screenshot their order confirmation,
 * but bounds the window in which a leaked URL (screen-share, browser
 * history sync, referrer header) can expose PII and order details.
 * Signed-in customers can always find the order via `/account/orders`
 * regardless.
 */
const ORDER_TOKEN_TTL_DAYS = 30;

export async function createOrder(
  formData: Record<string, unknown>,
  cartItems: CartItemInput[],
  channel: 'PAYSTACK' | 'WHATSAPP',
): Promise<ActionResult<CreateOrderResult>> {
  const parsed = checkoutFormSchema.safeParse(formData);
  if (!parsed.success) {
    return {
      success: false,
      error: 'Please check your form fields.',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  // Validate the cart payload server-side. The client persists this
  // in localStorage and so it's effectively user-controlled input —
  // see `cartItemSchema` for the full attack surface this closes
  // (negative quantities, NaN, non-CUID IDs, bulk-insert DoS).
  const parsedItems = cartItemsArraySchema.safeParse(cartItems);
  if (!parsedItems.success) {
    return {
      success: false,
      error:
        parsedItems.error.issues[0]?.message ??
        'Your cart contains an invalid item. Please refresh and try again.',
    };
  }
  const safeItems = parsedItems.data;

  // Email is optional for WhatsApp (we contact via the phone number)
  // but Paystack NEEDS it — their inline checkout requires a customer
  // email to charge, and without one we'd create a PENDING order that
  // can never be paid (inventory held for no reason). Enforce here on
  // the server so a DevTools-tampered client can't bypass the UI's
  // required-field attribute. `parsed.data.customerEmail` is already
  // trimmed by Zod; treat empty string as missing.
  if (channel === 'PAYSTACK' && !parsed.data.customerEmail) {
    return {
      success: false,
      error: 'Email is required for card payment.',
      fieldErrors: {
        customerEmail: ['Email is required for card payment.'],
      },
    };
  }

  // Best-effort user lookup — anonymous checkout is still supported.
  // When the shopper is signed in, we link the order to their User
  // record so it appears under `/account/orders`. Failures fall back
  // to guest checkout (null userId) rather than blocking the sale.
  const current = await getCurrentUser();

  try {
    // Fetch current prices from DB (never trust client)
    const productIds = [...new Set(safeItems.map((i) => i.productId))];
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      include: { variants: true },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));

    // Validate stock and calculate totals
    let subtotal = 0;
    const orderItems: {
      productId: string;
      variantId: string | null;
      name: string;
      variantName: string | null;
      price: number;
      quantity: number;
      total: number;
    }[] = [];

    for (const cartItem of safeItems) {
      const product = productMap.get(cartItem.productId);
      if (!product) {
        return { success: false, error: `Product not found.` };
      }

      let price: number;
      let stockQty: number;
      let variantName: string | null = null;

      if (cartItem.variantId) {
        const variant = product.variants.find(
          (v) => v.id === cartItem.variantId,
        );
        if (!variant) {
          return { success: false, error: `Product variant not found.` };
        }
        price = Number(variant.price);
        stockQty = variant.stockQuantity;
        variantName = variant.label;
      } else {
        price = Number(product.basePrice);
        stockQty = product.stockQuantity;
      }

      if (cartItem.quantity > stockQty) {
        return {
          success: false,
          error: `${product.name} only has ${stockQty} in stock.`,
        };
      }

      const lineTotal = price * cartItem.quantity;
      subtotal += lineTotal;

      orderItems.push({
        productId: product.id,
        variantId: cartItem.variantId,
        name: product.name,
        variantName,
        price,
        quantity: cartItem.quantity,
        total: lineTotal,
      });
    }

    // Get shipping settings
    const settings = await prisma.storeSettings.findUnique({
      where: { id: 'default' },
    });
    const shippingFee = settings ? Number(settings.shippingFee) : 0;
    const freeMin = settings?.freeShippingMin
      ? Number(settings.freeShippingMin)
      : null;
    const shippingCost = freeMin && subtotal >= freeMin ? 0 : shippingFee;
    const total = subtotal + shippingCost;

    // Generate capability token — this, NOT the orderNumber, is what the
    // success page uses to authorize access. Order numbers are sequential
    // and easily guessed; tokens are 256-bit random values.
    const accessToken = generateOrderAccessToken();
    const accessTokenExpiresAt = new Date(
      Date.now() + ORDER_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
    );
    // Regenerated per attempt (see loop): the `paymentReference @unique`
    // constraint means a cosmic-ray collision would fail with P2002,
    // and we retry with a fresh value rather than failing the customer.
    let paymentReference = generatePaymentReference();

    // Order-number generation is racy: two concurrent checkouts that read
    // the same `todayCount` would both compute the same number and the
    // second insert would hit the `orderNumber` unique constraint. Retry
    // on P2002 with a fresh count so parallel checkouts don't fail for
    // customers. 5 attempts is plenty for realistic traffic.
    // Lagos midnight, not server-local (UTC) midnight, so the daily
    // order-number sequence rolls over at 00:00 Lagos rather than 1
    // AM Lagos.
    const today = lagosStartOfDay();

    let orderNumber = '';
    let attempt = 0;
    const MAX_ATTEMPTS = 5;

    while (attempt < MAX_ATTEMPTS) {
      const todayCount = await prisma.order.count({
        where: { createdAt: { gte: today } },
      });
      orderNumber = formatOrderNumber(new Date(), todayCount + 1 + attempt);

      try {
        await prisma.$transaction(async (tx) => {
          await tx.order.create({
            data: {
              orderNumber,
              accessToken,
              accessTokenExpiresAt,
              userId: current?.id ?? null,
              status: 'PENDING',
              channel,
              customerName: parsed.data.customerName,
              customerEmail: parsed.data.customerEmail || null,
              customerPhone: parsed.data.customerPhone,
              shippingAddress: parsed.data.shippingAddress,
              shippingCity: parsed.data.shippingCity,
              shippingState: parsed.data.shippingState,
              notes: parsed.data.notes || null,
              subtotal,
              shippingCost,
              total,
              paymentReference: channel === 'PAYSTACK' ? paymentReference : null,
              items: { create: orderItems },
            },
          });

          // Conditional stock decrement. `updateMany` with a `gte` guard
          // lets us detect "stock was taken by a concurrent order" by
          // checking the affected count — if zero rows updated, we
          // throw to abort the transaction. This closes the window
          // between the pre-check above and the decrement here.
          for (const cartItem of safeItems) {
            if (cartItem.variantId) {
              const res = await tx.productVariant.updateMany({
                where: {
                  id: cartItem.variantId,
                  stockQuantity: { gte: cartItem.quantity },
                },
                data: { stockQuantity: { decrement: cartItem.quantity } },
              });
              if (res.count === 0) {
                throw new Error('STOCK_RACE');
              }
            } else {
              const res = await tx.product.updateMany({
                where: {
                  id: cartItem.productId,
                  stockQuantity: { gte: cartItem.quantity },
                },
                data: { stockQuantity: { decrement: cartItem.quantity } },
              });
              if (res.count === 0) {
                throw new Error('STOCK_RACE');
              }
            }
          }
        });
        // Success — exit retry loop
        break;
      } catch (err) {
        // Stock race inside the transaction: surface a friendly error
        // without retrying; the customer needs to reload the cart.
        if (err instanceof Error && err.message === 'STOCK_RACE') {
          return {
            success: false,
            error:
              'One of the items in your cart was just purchased by someone else. Please refresh and try again.',
          };
        }
        // Duplicate orderNumber OR paymentReference — retry with a
        // bumped count and a fresh 128-bit reference. Either collision
        // is astronomically unlikely with crypto randomness, but the
        // `@unique` constraint fails closed so we roll again rather
        // than fail the customer.
        const isUniqueViolation =
          typeof err === 'object' &&
          err !== null &&
          'code' in err &&
          (err as { code?: string }).code === 'P2002';
        if (isUniqueViolation) {
          attempt++;
          if (attempt >= MAX_ATTEMPTS) throw err;
          paymentReference = generatePaymentReference();
          continue;
        }
        throw err;
      }
    }

    // Persist the token as an HTTP-only cookie so a redirect-heavy
    // payment flow (Paystack → our /success) can still find the order
    // even if the `t` query param is stripped by an intermediary.
    const cookieStore = await cookies();
    cookieStore.set(ORDER_TOKEN_COOKIE, accessToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24, // 24h — enough time for post-payment redirects
    });

    // Bust the storefront's ISR cache so the stock counts on the home
    // page (revalidate=3600) and product pages (revalidate=1800) reflect
    // the just-decremented inventory. Without this, a customer who buys
    // the last unit leaves a "5 in stock" lie up for ~30 minutes, and
    // the next visitor's checkout fails the server-side stock guard.
    revalidatePath('/');
    revalidatePath('/products');
    for (const item of orderItems) {
      const slug = productMap.get(item.productId)?.slug;
      if (slug) revalidatePath(`/products/${slug}`);
    }

    return {
      success: true,
      data: {
        orderNumber,
        accessToken,
        paymentReference,
        // Paystack expects integer kobo. Fractional values silently reject.
        amount: Math.round(total * 100),
        email: parsed.data.customerEmail || '',
      },
    };
  } catch (error) {
    logServerError('orders.create', error);
    return {
      success: false,
      error: 'Failed to create order. Please try again.',
    };
  }
}

/**
 * Admin: transition an order to a new status.
 *
 * Correctness properties this function guarantees:
 *
 *   1. The status value is validated against the Prisma enum (Zod).
 *   2. The transition is validated against the order state machine
 *      (see `lib/order-state.ts`) — e.g., DELIVERED → PROCESSING is
 *      rejected, CANCELLED → anything is rejected, etc.
 *   3. Stock accounting is **idempotent**: we only credit stock back
 *      when `stockReleased` flips from false to true, and only claim
 *      stock back when it flips from true to false. An admin cannot
 *      double-credit by toggling status repeatedly.
 *   4. Re-claiming stock after a CANCELLED → active transition uses
 *      `updateMany` with a `gte` guard so we never oversell if stock
 *      was moved/edited during the cancellation window.
 *      (Today the state machine forbids this transition outright, but
 *      the defensive check remains in case the policy changes.)
 *   5. Missing variants (deleted since the order was placed) no longer
 *      abort the whole transition — `updateMany` on a non-existent id
 *      is a silent no-op, which matches the "stock was already
 *      reallocated" reality for those legacy rows.
 */
export async function updateOrderStatus(
  orderId: string,
  payload: unknown,
): Promise<ActionResult> {
  try {
    await requireAdmin();
  } catch {
    return { success: false, error: 'Unauthorized' };
  }

  const parsed = orderStatusUpdateSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      success: false,
      error: 'Please choose a valid status.',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }
  const target: OrderStatus = parsed.data.status;

  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) {
      return { success: false, error: 'Order not found.' };
    }

    const current = order.status as OrderStatus;
    if (current === target) {
      // Nothing to do — preserves a fast-path, matches the "no-op" toast
      // expectation on the client.
      return { success: true, data: undefined };
    }

    if (!canTransition(current, target)) {
      return {
        success: false,
        error: `Cannot change order from ${current} to ${target}.`,
      };
    }

    const targetHoldsStock = holdsStock(target);
    const shouldReleaseStock =
      order.stockReleased && !targetHoldsStock; // active → CANCELLED/REFUNDED
    const shouldReclaimStock =
      !order.stockReleased && targetHoldsStock; // CANCELLED → active (blocked by state machine today)

    await prisma.$transaction(async (tx) => {
      if (shouldReleaseStock) {
        for (const item of order.items) {
          if (item.variantId) {
            // updateMany is a silent no-op if the variant was deleted —
            // this avoids aborting the whole status change on a missing
            // historical variant.
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
      } else if (shouldReclaimStock) {
        // Guarded re-decrement: only succeeds if stock is still
        // available. If a concurrent order has claimed it, throw
        // STOCK_RACE and surface the error to the admin.
        for (const item of order.items) {
          if (item.variantId) {
            const res = await tx.productVariant.updateMany({
              where: {
                id: item.variantId,
                stockQuantity: { gte: item.quantity },
              },
              data: { stockQuantity: { decrement: item.quantity } },
            });
            if (res.count === 0) {
              throw new Error('STOCK_RACE');
            }
          } else {
            const res = await tx.product.updateMany({
              where: {
                id: item.productId,
                stockQuantity: { gte: item.quantity },
              },
              data: { stockQuantity: { decrement: item.quantity } },
            });
            if (res.count === 0) {
              throw new Error('STOCK_RACE');
            }
          }
        }
      }

      await tx.order.update({
        where: { id: orderId },
        data: {
          status: target,
          // Flip the flag only if we actually did stock work. Preserves
          // the invariant: `stockReleased === true` ⇔ inventory has
          // been subtracted for this order.
          ...(shouldReleaseStock ? { stockReleased: false } : {}),
          ...(shouldReclaimStock ? { stockReleased: true } : {}),
        },
      });
    });

    revalidatePath(`/admin/orders/${orderId}`);
    revalidatePath('/admin/orders');
    revalidatePath('/admin');
    return { success: true, data: undefined };
  } catch (error) {
    if (error instanceof Error && error.message === 'STOCK_RACE') {
      return {
        success: false,
        error:
          'Stock for one of the items has since been claimed by another order. Restock before changing this status.',
      };
    }
    logServerError('orders.updateStatus', error);
    return { success: false, error: 'Failed to update order status.' };
  }
}

export async function updateOrderNotes(
  orderId: string,
  adminNotes: string,
): Promise<ActionResult> {
  try {
    await requireAdmin();
  } catch {
    return { success: false, error: 'Unauthorized' };
  }

  const parsed = orderNotesUpdateSchema.safeParse({ adminNotes });
  if (!parsed.success) {
    return {
      success: false,
      error: 'Please check the notes field.',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    await prisma.order.update({
      where: { id: orderId },
      data: { adminNotes: parsed.data.adminNotes },
    });
    revalidatePath(`/admin/orders/${orderId}`);
    return { success: true, data: undefined };
  } catch (error) {
    logServerError('orders.updateNotes', error);
    return { success: false, error: 'Failed to update notes.' };
  }
}

/**
 * Admin: kick off a Paystack refund.
 *
 * Important sequencing:
 *
 *   - We do NOT flip the order to REFUNDED here, and we do NOT release
 *     stock here. Paystack's refund API is asynchronous — a 200 on
 *     this call means "refund request accepted", not "money returned".
 *     The `refund.processed` webhook is authoritative.
 *
 *   - Until that webhook fires (seconds → hours depending on the
 *     card network), we flip the order to `paymentStatus: 'refunding'`
 *     and append the reason to adminNotes so the order page reflects
 *     the in-flight refund. The state stays at its current value
 *     (CONFIRMED / DELIVERED / etc.) — if the refund fails on
 *     Paystack's end, the order is exactly where the admin left it.
 *
 *   - This prevents the two classes of bug from the audit:
 *       (a) stock is released locally but money is still held by
 *           Paystack (admin forgot to refund manually);
 *       (b) admin clicks refund twice and we double-credit stock.
 *
 * Preconditions:
 *   - Order must be PAYSTACK channel.
 *   - Order must have a captured paystackTransactionId (set on
 *     `charge.success`) OR a paymentReference (Paystack accepts either
 *     as the `transaction` field of the refund API).
 *   - Order must be in an active status (not already REFUNDED /
 *     CANCELLED — those paths don't need a refund).
 */
export async function refundOrder(
  orderId: string,
  payload: unknown,
): Promise<ActionResult> {
  try {
    await requireAdmin();
  } catch {
    return { success: false, error: 'Unauthorized' };
  }

  const parsed = orderRefundSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      success: false,
      error:
        parsed.error.issues[0]?.message ??
        'Please provide a refund reason.',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        orderNumber: true,
        channel: true,
        status: true,
        total: true,
        paymentReference: true,
        paystackTransactionId: true,
        paymentStatus: true,
        adminNotes: true,
      },
    });

    if (!order) return { success: false, error: 'Order not found.' };

    if (order.channel !== 'PAYSTACK') {
      return {
        success: false,
        error:
          'Only Paystack orders can be refunded here. WhatsApp orders require an offline refund.',
      };
    }

    if (order.status === 'REFUNDED' || order.status === 'CANCELLED') {
      return {
        success: false,
        error: `Order is already ${order.status.toLowerCase()}.`,
      };
    }

    if (order.paymentStatus === 'refunding') {
      return {
        success: false,
        error:
          'A refund is already in progress for this order. Wait for Paystack to finalise it.',
      };
    }

    const transactionTarget =
      order.paystackTransactionId ?? order.paymentReference;
    if (!transactionTarget) {
      return {
        success: false,
        error: 'No Paystack transaction on file for this order.',
      };
    }

    // Mark the refund as in-flight FIRST. If we called Paystack first
    // and our DB update failed afterwards, the refund would be live at
    // Paystack while admin UI still showed "Refund" as clickable —
    // admin double-clicks, second Paystack call rejects with "already
    // refunded". Writing the lock first means a Paystack failure is
    // recoverable: we revert the field below.
    const notePrefix = order.adminNotes ? `${order.adminNotes}\n\n` : '';
    const stamp = new Date().toISOString().slice(0, 10);
    const newNote = `${notePrefix}[${stamp}] Refund initiated: ${parsed.data.reason}`;

    await prisma.order.update({
      where: { id: orderId },
      data: {
        paymentStatus: 'refunding',
        adminNotes: newNote.slice(0, 4000),
      },
    });

    // Call Paystack's refund API. Amount is in kobo; omitting it
    // defaults to a full refund which is the only flow we expose from
    // the UI right now (partial refunds are deferred).
    const totalKobo = Math.round(Number(order.total) * 100);
    try {
      await refundTransaction(transactionTarget, totalKobo, parsed.data.reason);
    } catch (paystackError) {
      // Revert the in-flight lock so admin can retry. We don't undo
      // the adminNotes line — keeping the audit trail of "we tried"
      // is intentional.
      await prisma.order.update({
        where: { id: orderId },
        data: { paymentStatus: order.paymentStatus },
      });
      throw paystackError;
    }

    revalidatePath(`/admin/orders/${orderId}`);
    revalidatePath('/admin/orders');
    return { success: true, data: undefined };
  } catch (error) {
    logServerError('orders.refund', error);
    const message =
      error instanceof Error && error.message.startsWith('Paystack refund failed:')
        ? error.message
        : 'Failed to initiate refund. Please try again or contact support.';
    return { success: false, error: message };
  }
}

/**
 * Customer: cancel a PENDING order when the Paystack popup is closed
 * without completing payment.
 *
 * Called from `CheckoutClient`'s `onCancel` handler. Without this,
 * the stock stays held indefinitely and a malicious (or clumsy)
 * customer can exhaust inventory by opening-and-closing the popup
 * repeatedly. The rate limiter upstream caps it further.
 *
 * Authorisation: we accept the capability `accessToken` as the
 * "I placed this order" proof. Spoofing it requires guessing a
 * 256-bit random value, which is safe enough that we don't require
 * login. The token is never logged.
 */
export async function cancelPendingOrder(
  accessToken: string,
): Promise<ActionResult> {
  if (typeof accessToken !== 'string' || accessToken.length < 20) {
    return { success: false, error: 'Invalid order token.' };
  }

  try {
    const order = await prisma.order.findUnique({
      where: { accessToken },
      select: {
        id: true,
        status: true,
        stockReleased: true,
        channel: true,
        items: {
          select: { productId: true, variantId: true, quantity: true },
        },
      },
    });

    if (!order) return { success: true, data: undefined }; // fail silently
    if (order.channel !== 'PAYSTACK') return { success: true, data: undefined };
    if (order.status !== 'PENDING') return { success: true, data: undefined };

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
          paymentStatus: 'cancelled',
          stockReleased: false,
        },
      });
    });

    return { success: true, data: undefined };
  } catch (error) {
    logServerError('orders.cancelPending', error);
    // Don't leak DB errors to the customer — they're cancelling, the
    // cleanup cron will catch this row if it lingers.
    return { success: true, data: undefined };
  }
}

/**
 * Admin: sweep abandoned PENDING Paystack orders right now.
 *
 * Same logic as the cron endpoint (`/api/internal/release-abandoned-orders`)
 * but gated on admin session instead of `CRON_SECRET`. Useful when an
 * admin spots leaked stock and wants to reclaim it immediately.
 *
 * We hard-cap `olderThanMinutes` at 10 as a safety floor — anything
 * younger might legitimately still be in Paystack's settlement queue.
 */
export async function adminSweepAbandonedOrders(
  olderThanMinutes = 30,
): Promise<ActionResult<{ considered: number; cancelled: number; promoted: number; errored: number }>> {
  try {
    await requireAdmin();
  } catch {
    return { success: false, error: 'Unauthorized' };
  }

  const minutes = Math.max(10, Math.min(olderThanMinutes, 1440));

  try {
    const result = await sweepAbandonedPendingOrders(minutes);
    revalidatePath('/admin/orders');
    revalidatePath('/admin');
    return { success: true, data: result };
  } catch (error) {
    logServerError('orders.adminSweepAbandoned', error);
    return { success: false, error: 'Sweep failed. Please try again.' };
  }
}

/**
 * Lightweight order-status polling endpoint for the success page.
 *
 * The success page reconciles with Paystack once on SSR load, but if
 * that returned PENDING (webhook still in-flight), the page now polls
 * this action every 5s for up to 2 minutes. We do NOT re-run
 * reconciliation here — just read the current DB state, which the
 * webhook path flips independently.
 *
 * Authorisation: capability token, same model as the page itself.
 */
export async function getOrderStatusByToken(
  accessToken: string,
): Promise<ActionResult<{ status: string; paymentStatus: string | null }>> {
  if (typeof accessToken !== 'string' || accessToken.length < 20) {
    return { success: false, error: 'Invalid order token.' };
  }

  try {
    const now = new Date();
    const order = await prisma.order.findFirst({
      where: {
        accessToken,
        OR: [
          { accessTokenExpiresAt: null },
          { accessTokenExpiresAt: { gt: now } },
        ],
      },
      select: { status: true, paymentStatus: true },
    });
    if (!order) return { success: false, error: 'Order not found.' };
    return {
      success: true,
      data: { status: order.status, paymentStatus: order.paymentStatus },
    };
  } catch (error) {
    logServerError('orders.getStatusByToken', error);
    return { success: false, error: 'Could not refresh status.' };
  }
}

