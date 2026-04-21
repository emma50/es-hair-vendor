/**
 * End-to-end flow tests for the post-payment lifecycle: Paystack fires
 * a webhook at our /api/webhooks/paystack route → we verify the HMAC
 * signature → flip the order PENDING → CONFIRMED.
 *
 * These round-trip through the real webhook route handler so we catch
 * regressions in signature verification, body parsing, idempotency,
 * and the status query filter.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createHmac } from 'node:crypto';
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

const SECRET = 'sk_test_paystack_secret_for_flow_tests';

/** Force the shared env onto every import that reads it. */
function stubSecret() {
  vi.stubEnv('PAYSTACK_SECRET_KEY', SECRET);
}

const { POST: webhookPOST } = await import(
  '@/app/api/webhooks/paystack/route'
);

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

function seedPendingOrder(reference: string) {
  const cat = fakeDB.seedCategory({ name: 'Bundles', slug: 'bundles' });
  const product = fakeDB.seedProduct({ categoryId: cat.id });
  const id = 'order_' + reference;
  fakeDB.db.orders.set(id, {
    id,
    orderNumber: 'ESH-20260419-0001',
    accessToken: 'token_' + reference,
    status: 'PENDING',
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
    paymentStatus: null,
    notes: null,
    adminNotes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    items: [],
  } as unknown as ReturnType<typeof fakeDB.db.orders.get> & object);
  return { product, orderId: id };
}

beforeEach(() => {
  resetAll();
  stubSecret();
});

describe('Paystack webhook — charge.success', () => {
  it('flips PENDING order to CONFIRMED on a valid signature', async () => {
    const ref = 'ESH-TEST-123';
    const { orderId } = seedPendingOrder(ref);
    const body = JSON.stringify({
      event: 'charge.success',
      data: { reference: ref, amount: 4_750_000, status: 'success' },
    });
    const response = await webhookPOST(buildRequest(body, sign(body)));
    expect(response.status).toBe(200);
    const json = (await response.json()) as { received: boolean };
    expect(json.received).toBe(true);
    const order = fakeDB.db.orders.get(orderId)!;
    expect(order.status).toBe('CONFIRMED');
    expect(order.paymentStatus).toBe('paid');
  });

  it('is idempotent — a duplicate webhook does not re-flip the order', async () => {
    const ref = 'ESH-TEST-DUPE';
    const { orderId } = seedPendingOrder(ref);
    const body = JSON.stringify({
      event: 'charge.success',
      data: { reference: ref, amount: 4_750_000 },
    });
    // First delivery.
    await webhookPOST(buildRequest(body, sign(body)));
    const order1 = fakeDB.db.orders.get(orderId)!;
    const firstUpdate = order1.updatedAt;

    // Second delivery — status already CONFIRMED, `where` guard should
    // skip any re-write.
    await new Promise((r) => setTimeout(r, 5)); // sub-ms clock tick
    await webhookPOST(buildRequest(body, sign(body)));
    const order2 = fakeDB.db.orders.get(orderId)!;
    expect(order2.status).toBe('CONFIRMED');
    // updatedAt stays unchanged on the second delivery (guard matched 0 rows).
    expect(order2.updatedAt.getTime()).toBe(firstUpdate.getTime());
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

  it('ignores non-charge.success events (e.g. charge.failed)', async () => {
    const ref = 'ESH-TEST-FAILED';
    const { orderId } = seedPendingOrder(ref);
    const body = JSON.stringify({
      event: 'charge.failed',
      data: { reference: ref },
    });
    const response = await webhookPOST(buildRequest(body, sign(body)));
    expect(response.status).toBe(200);
    // Order stays PENDING.
    expect(fakeDB.db.orders.get(orderId)!.status).toBe('PENDING');
  });

  it('no-ops when no order matches the reference (out-of-band/test hit)', async () => {
    const body = JSON.stringify({
      event: 'charge.success',
      data: { reference: 'ESH-DOES-NOT-EXIST' },
    });
    const response = await webhookPOST(buildRequest(body, sign(body)));
    expect(response.status).toBe(200);
  });

  it('returns 500 on malformed JSON after sig passes', async () => {
    const body = 'not-json-at-all';
    const response = await webhookPOST(buildRequest(body, sign(body)));
    expect(response.status).toBe(500);
  });
});
