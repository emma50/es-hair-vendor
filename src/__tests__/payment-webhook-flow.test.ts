/**
 * End-to-end flow tests for the post-payment lifecycle: Paystack fires
 * a webhook at our /api/webhooks/paystack route → we verify the HMAC
 * signature → claim the `ProcessedWebhookEvent` idempotency row → dispatch
 * to the per-event handler.
 *
 * These round-trip through the real webhook route handler so we catch
 * regressions in signature verification, body parsing, dedup, amount
 * reverification, and the refund / dispute flows.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createHmac } from 'node:crypto';
import type { OrderItem, OrderStatus } from '@prisma/client';
import { fakeDB, resetAll } from './helpers/flow-singletons';

vi.mock('@/lib/prisma', async () => {
  const mod = await import('./helpers/flow-singletons');
  return { prisma: mod.prismaMock };
});

// Webhook route doesn't need supabase/headers/cookies, but the shared
// singletons import prisma. Mock these defensively for parity with the
// other flow tests.
vi.mock('@/lib/supabase/server', async () => {
  const mod = await import('./helpers/flow-singletons');
  return { createClient: async () => ({ auth: mod.fakeSupabase }) };
});

vi.mock('next/headers', async () => {
  const mod = await import('./helpers/flow-singletons');
  return {
    cookies: async () => mod.fakeCookies,
    headers: async () => mod.fakeHeaders,
  };
});

vi.mock('next/cache', () => ({
  revalidatePath: () => {},
  revalidateTag: () => {},
}));

// The real webhook handler calls `verifyTransaction` which hits the
// Paystack REST API. Stub it per-test via `setVerifyTransaction` so we
// control the "source-of-truth" response without touching fetch. Keep
// the real `verifyWebhookSignature` so HMAC coverage stays end-to-end.
type VerifyFn = (ref: string) => Promise<{
  status: boolean;
  data: {
    id?: number;
    status: string;
    reference: string;
    amount: number;
    currency: string;
  };
}>;
const DEFAULT_VERIFY: VerifyFn = async (reference) => ({
  status: true,
  data: {
    id: 999,
    status: 'success',
    reference,
    amount: 4_750_000,
    currency: 'NGN',
  },
});
const verifyTransactionRef: { fn: VerifyFn } = { fn: DEFAULT_VERIFY };
function setVerifyTransaction(fn: VerifyFn) {
  verifyTransactionRef.fn = fn;
}

vi.mock('@/lib/paystack', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/paystack')>('@/lib/paystack');
  return {
    ...actual,
    verifyTransaction: (ref: string) => verifyTransactionRef.fn(ref),
  };
});

const SECRET = 'sk_test_paystack_secret_for_flow_tests';

/** Force the shared env onto every import that reads it. */
function stubSecret() {
  vi.stubEnv('PAYSTACK_SECRET_KEY', SECRET);
}

const { POST: webhookPOST } = await import('@/app/api/webhooks/paystack/route');

function sign(body: string) {
  return createHmac('sha512', SECRET).update(body).digest('hex');
}

function buildRequest(body: string, signature: string | null) {
  const headers = new Headers();
  if (signature !== null) headers.set('x-paystack-signature', signature);
  return new Request('https://example.com/api/webhooks/paystack', {
    method: 'POST',
    headers,
    body,
  });
}

/**
 * Seed a PENDING Paystack order. Accepts `withItems` so refund / failed
 * tests can assert stock is credited back; omit for dedup + signature
 * tests that don't care about line items.
 */
function seedPendingOrder(
  reference: string,
  opts: {
    withItems?: boolean;
    stockReleased?: boolean;
    status?: OrderStatus;
  } = {},
) {
  const cat = fakeDB.seedCategory({ name: 'Bundles', slug: 'bundles' });
  const product = fakeDB.seedProduct({
    categoryId: cat.id,
    stockQuantity: 10,
  });
  const id = 'order_' + reference;
  const items = opts.withItems
    ? [
        {
          id: 'item_' + reference,
          orderId: id,
          productId: product.id,
          variantId: null,
          name: product.name,
          variantName: null,
          price: 45000,
          quantity: 2,
          total: 90000,
        },
      ]
    : [];
  fakeDB.db.orders.set(id, {
    id,
    orderNumber: 'ESH-20260419-' + reference.slice(-4),
    accessToken: 'token_' + reference,
    status: opts.status ?? 'PENDING',
    channel: 'PAYSTACK',
    userId: null,
    customerName: 'Test',
    customerEmail: 't@example.com',
    customerPhone: '08012345678',
    shippingAddress: 'addr',
    shippingCity: 'Lagos',
    shippingState: 'Lagos',
    subtotal: 45000,
    shippingCost: 2500,
    total: 47500,
    currency: 'NGN',
    paymentReference: reference,
    paystackTransactionId: null,
    paymentStatus: null,
    notes: null,
    adminNotes: null,
    accessTokenExpiresAt: null,
    abandonedAt: null,
    stockReleased: opts.stockReleased ?? true,
    createdAt: new Date(),
    updatedAt: new Date(),
    items,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
  // Items must also live in the orderItems map so tx reads find them.
  for (const it of items) {
    fakeDB.db.orderItems.set(it.id, it as unknown as OrderItem);
  }
  return { product, orderId: id };
}

beforeEach(() => {
  resetAll();
  stubSecret();
  setVerifyTransaction(DEFAULT_VERIFY);
});

describe('Paystack webhook — charge.success', () => {
  it('flips PENDING order to CONFIRMED on a valid signature', async () => {
    const ref = 'ESH-TEST-123';
    const { orderId } = seedPendingOrder(ref);
    const body = JSON.stringify({
      event: 'charge.success',
      id: 'evt-123',
      data: {
        reference: ref,
        amount: 4_750_000,
        status: 'success',
        id: 7001,
        currency: 'NGN',
      },
    });
    const response = await webhookPOST(buildRequest(body, sign(body)));
    expect(response.status).toBe(200);
    const json = (await response.json()) as { received: boolean };
    expect(json.received).toBe(true);
    const order = fakeDB.db.orders.get(orderId)!;
    expect(order.status).toBe('CONFIRMED');
    expect(order.paymentStatus).toBe('paid');
    // REST verify "data.id" is captured for later refund calls.
    expect(order.paystackTransactionId).toBe('999');
  });

  it('rejects with 401 on an invalid signature', async () => {
    seedPendingOrder('ESH-TEST-BAD-SIG');
    const body = JSON.stringify({
      event: 'charge.success',
      data: { reference: 'ESH-TEST-BAD-SIG' },
    });
    const response = await webhookPOST(buildRequest(body, 'wrong-sig'));
    expect(response.status).toBe(401);
  });

  it('rejects with 401 when signature header is missing', async () => {
    seedPendingOrder('ESH-TEST-NO-SIG');
    const body = JSON.stringify({
      event: 'charge.success',
      data: { reference: 'ESH-TEST-NO-SIG' },
    });
    const response = await webhookPOST(buildRequest(body, null));
    expect(response.status).toBe(401);
  });

  it('does NOT flip the order when REST verify returns a non-success status', async () => {
    const ref = 'ESH-TEST-VERIFY-FAIL';
    const { orderId } = seedPendingOrder(ref);
    // Paystack's REST says "pending" even though the webhook claimed
    // success — refuse to confirm.
    setVerifyTransaction(async (reference) => ({
      status: true,
      data: {
        id: 42,
        status: 'pending',
        reference,
        amount: 4_750_000,
        currency: 'NGN',
      },
    }));
    const body = JSON.stringify({
      event: 'charge.success',
      id: 'evt-verify-fail',
      data: {
        reference: ref,
        amount: 4_750_000,
        status: 'success',
        currency: 'NGN',
      },
    });
    const response = await webhookPOST(buildRequest(body, sign(body)));
    expect(response.status).toBe(200);
    expect(fakeDB.db.orders.get(orderId)!.status).toBe('PENDING');
  });

  it('does NOT flip the order when webhook amount disagrees with order total', async () => {
    const ref = 'ESH-TEST-AMOUNT-MISMATCH';
    const { orderId } = seedPendingOrder(ref);
    const body = JSON.stringify({
      event: 'charge.success',
      id: 'evt-amt',
      // Off by one kobo.
      data: {
        reference: ref,
        amount: 4_749_999,
        status: 'success',
        currency: 'NGN',
      },
    });
    const response = await webhookPOST(buildRequest(body, sign(body)));
    expect(response.status).toBe(200);
    expect(fakeDB.db.orders.get(orderId)!.status).toBe('PENDING');
  });

  it('no-ops when no order matches the reference (out-of-band/test hit)', async () => {
    const body = JSON.stringify({
      event: 'charge.success',
      id: 'evt-no-order',
      data: { reference: 'ESH-DOES-NOT-EXIST' },
    });
    const response = await webhookPOST(buildRequest(body, sign(body)));
    expect(response.status).toBe(200);
  });

  it('returns 400 on malformed JSON after sig passes', async () => {
    const body = 'not-json-at-all';
    const response = await webhookPOST(buildRequest(body, sign(body)));
    expect(response.status).toBe(400);
  });
});

describe('Paystack webhook — ProcessedWebhookEvent dedup', () => {
  it('acks duplicate deliveries of the same event.id without re-running the handler', async () => {
    const ref = 'ESH-DEDUP-001';
    const { orderId } = seedPendingOrder(ref);
    const body = JSON.stringify({
      event: 'charge.success',
      id: 'evt-dedup-xyz',
      data: {
        reference: ref,
        amount: 4_750_000,
        status: 'success',
        currency: 'NGN',
      },
    });

    // First delivery → handler runs, order CONFIRMED, one dedup row inserted.
    const res1 = await webhookPOST(buildRequest(body, sign(body)));
    expect(res1.status).toBe(200);
    expect(fakeDB.db.orders.get(orderId)!.status).toBe('CONFIRMED');
    expect(fakeDB.db.processedWebhookEvents.size).toBe(1);

    // Spy on verifyTransaction — a true replay should NOT hit it again.
    let verifyCalls = 0;
    setVerifyTransaction(async (reference) => {
      verifyCalls++;
      return {
        status: true,
        data: {
          id: 999,
          status: 'success',
          reference,
          amount: 4_750_000,
          currency: 'NGN',
        },
      };
    });

    // Second delivery, same event.id → P2002 on dedup insert → ack with duplicate flag.
    const res2 = await webhookPOST(buildRequest(body, sign(body)));
    expect(res2.status).toBe(200);
    const json = (await res2.json()) as {
      received: boolean;
      duplicate?: boolean;
    };
    expect(json.received).toBe(true);
    expect(json.duplicate).toBe(true);
    // Handler path short-circuits before verifyTransaction.
    expect(verifyCalls).toBe(0);
    // And of course no new dedup row.
    expect(fakeDB.db.processedWebhookEvents.size).toBe(1);
  });

  it('treats two different events with distinct ids as independent', async () => {
    const ref = 'ESH-DEDUP-002';
    seedPendingOrder(ref);
    const bodyA = JSON.stringify({
      event: 'charge.success',
      id: 'evt-A',
      data: {
        reference: ref,
        amount: 4_750_000,
        status: 'success',
        currency: 'NGN',
      },
    });
    await webhookPOST(buildRequest(bodyA, sign(bodyA)));

    const bodyB = JSON.stringify({
      event: 'charge.dispute.create',
      id: 'evt-B',
      data: { reference: ref, transaction: { reference: ref } },
    });
    await webhookPOST(buildRequest(bodyB, sign(bodyB)));

    expect(fakeDB.db.processedWebhookEvents.size).toBe(2);
  });
});

describe('Paystack webhook — charge.failed / charge.abandoned', () => {
  it('cancels a PENDING order and credits stock back on charge.failed', async () => {
    const ref = 'ESH-FAIL-001';
    const { orderId, product } = seedPendingOrder(ref, { withItems: true });
    const stockBefore = fakeDB.db.products.get(product.id)!.stockQuantity;

    const body = JSON.stringify({
      event: 'charge.failed',
      id: 'evt-fail-1',
      data: { reference: ref },
    });
    const response = await webhookPOST(buildRequest(body, sign(body)));
    expect(response.status).toBe(200);

    const order = fakeDB.db.orders.get(orderId)!;
    expect(order.status).toBe('CANCELLED');
    expect(order.paymentStatus).toBe('failed');
    expect(order.stockReleased).toBe(false);
    // 2 units restocked.
    expect(fakeDB.db.products.get(product.id)!.stockQuantity).toBe(
      stockBefore + 2,
    );
  });

  it('is idempotent — a second charge.failed for the same order does not double-credit stock', async () => {
    const ref = 'ESH-FAIL-DUPE';
    const { orderId, product } = seedPendingOrder(ref, { withItems: true });

    const bodyA = JSON.stringify({
      event: 'charge.failed',
      id: 'evt-fail-A',
      data: { reference: ref },
    });
    await webhookPOST(buildRequest(bodyA, sign(bodyA)));
    const stockAfterFirst = fakeDB.db.products.get(product.id)!.stockQuantity;
    expect(fakeDB.db.orders.get(orderId)!.status).toBe('CANCELLED');

    // Different event id so dedup doesn't mask this — the per-handler
    // status guard is what must hold.
    const bodyB = JSON.stringify({
      event: 'charge.failed',
      id: 'evt-fail-B',
      data: { reference: ref },
    });
    await webhookPOST(buildRequest(bodyB, sign(bodyB)));

    expect(fakeDB.db.products.get(product.id)!.stockQuantity).toBe(
      stockAfterFirst,
    );
  });
});

describe('Paystack webhook — refund.processed', () => {
  it('flips a CONFIRMED order to REFUNDED and credits stock back', async () => {
    const ref = 'ESH-REFUND-001';
    const { orderId, product } = seedPendingOrder(ref, {
      withItems: true,
      status: 'CONFIRMED',
    });
    const stockBefore = fakeDB.db.products.get(product.id)!.stockQuantity;

    const body = JSON.stringify({
      event: 'refund.processed',
      id: 'evt-refund-1',
      data: { transaction: { reference: ref } },
    });
    const response = await webhookPOST(buildRequest(body, sign(body)));
    expect(response.status).toBe(200);

    const order = fakeDB.db.orders.get(orderId)!;
    expect(order.status).toBe('REFUNDED');
    expect(order.paymentStatus).toBe('refunded');
    expect(order.stockReleased).toBe(false);
    expect(fakeDB.db.products.get(product.id)!.stockQuantity).toBe(
      stockBefore + 2,
    );
  });

  it('does not double-credit stock if the order was already CANCELLED (admin path released stock)', async () => {
    const ref = 'ESH-REFUND-ALREADY-CANCELLED';
    const { orderId, product } = seedPendingOrder(ref, {
      withItems: true,
      status: 'CANCELLED',
      stockReleased: false,
    });
    const stockBefore = fakeDB.db.products.get(product.id)!.stockQuantity;

    const body = JSON.stringify({
      event: 'refund.processed',
      id: 'evt-refund-already',
      data: { transaction: { reference: ref } },
    });
    await webhookPOST(buildRequest(body, sign(body)));

    // Status unchanged (CANCELLED is a terminal stock-released state)
    // and no stock movement.
    expect(fakeDB.db.orders.get(orderId)!.status).toBe('CANCELLED');
    expect(fakeDB.db.products.get(product.id)!.stockQuantity).toBe(stockBefore);
  });

  it('no-ops when no order matches the refund reference', async () => {
    const body = JSON.stringify({
      event: 'refund.processed',
      id: 'evt-refund-unknown',
      data: { transaction: { reference: 'ESH-UNKNOWN-REF' } },
    });
    const response = await webhookPOST(buildRequest(body, sign(body)));
    expect(response.status).toBe(200);
  });
});

describe('Paystack webhook — charge.dispute.create', () => {
  it('flips a CONFIRMED order to DISPUTED without releasing stock', async () => {
    const ref = 'ESH-DISPUTE-001';
    const { orderId, product } = seedPendingOrder(ref, {
      withItems: true,
      status: 'CONFIRMED',
    });
    const stockBefore = fakeDB.db.products.get(product.id)!.stockQuantity;

    const body = JSON.stringify({
      event: 'charge.dispute.create',
      id: 'evt-dispute-1',
      data: { transaction: { reference: ref } },
    });
    const response = await webhookPOST(buildRequest(body, sign(body)));
    expect(response.status).toBe(200);

    const order = fakeDB.db.orders.get(orderId)!;
    expect(order.status).toBe('DISPUTED');
    // Stock stays held — the cardholder could still lose the dispute.
    expect(order.stockReleased).toBe(true);
    expect(fakeDB.db.products.get(product.id)!.stockQuantity).toBe(stockBefore);
  });

  it('does not regress a CANCELLED order back to DISPUTED', async () => {
    const ref = 'ESH-DISPUTE-ON-CANCELLED';
    const { orderId } = seedPendingOrder(ref, { status: 'CANCELLED' });
    const body = JSON.stringify({
      event: 'charge.dispute.create',
      id: 'evt-dispute-cancelled',
      data: { transaction: { reference: ref } },
    });
    await webhookPOST(buildRequest(body, sign(body)));
    expect(fakeDB.db.orders.get(orderId)!.status).toBe('CANCELLED');
  });
});

describe('Paystack webhook — charge.dispute.resolve', () => {
  it('treats outcome=lost as a refund (DISPUTED → REFUNDED, stock credited back)', async () => {
    const ref = 'ESH-DISPUTE-LOST';
    const { orderId, product } = seedPendingOrder(ref, {
      withItems: true,
      status: 'DISPUTED',
    });
    const stockBefore = fakeDB.db.products.get(product.id)!.stockQuantity;

    const body = JSON.stringify({
      event: 'charge.dispute.resolve',
      id: 'evt-dispute-resolve-lost',
      data: { status: 'lost', transaction: { reference: ref } },
    });
    const response = await webhookPOST(buildRequest(body, sign(body)));
    expect(response.status).toBe(200);

    const order = fakeDB.db.orders.get(orderId)!;
    expect(order.status).toBe('REFUNDED');
    expect(order.paymentStatus).toBe('refunded');
    expect(fakeDB.db.products.get(product.id)!.stockQuantity).toBe(
      stockBefore + 2,
    );
  });

  it('treats outcome=merchant-accepted the same as a lost dispute', async () => {
    const ref = 'ESH-DISPUTE-MERCHANT-ACCEPT';
    const { orderId } = seedPendingOrder(ref, {
      withItems: true,
      status: 'DISPUTED',
    });
    const body = JSON.stringify({
      event: 'charge.dispute.resolve',
      id: 'evt-dispute-resolve-accept',
      data: { status: 'merchant-accepted', transaction: { reference: ref } },
    });
    await webhookPOST(buildRequest(body, sign(body)));
    expect(fakeDB.db.orders.get(orderId)!.status).toBe('REFUNDED');
  });

  it('leaves the order as DISPUTED when the merchant wins', async () => {
    const ref = 'ESH-DISPUTE-WON';
    const { orderId, product } = seedPendingOrder(ref, {
      withItems: true,
      status: 'DISPUTED',
    });
    const stockBefore = fakeDB.db.products.get(product.id)!.stockQuantity;

    const body = JSON.stringify({
      event: 'charge.dispute.resolve',
      id: 'evt-dispute-resolve-won',
      data: { status: 'won', transaction: { reference: ref } },
    });
    const response = await webhookPOST(buildRequest(body, sign(body)));
    expect(response.status).toBe(200);

    // DISPUTED → no auto-transition on "won"; admin has to restore
    // the prior status manually.
    expect(fakeDB.db.orders.get(orderId)!.status).toBe('DISPUTED');
    expect(fakeDB.db.products.get(product.id)!.stockQuantity).toBe(stockBefore);
  });
});
