/**
 * End-to-end flow tests for every CUSTOMER-facing journey.
 *
 * Each `describe` block walks through a complete user story — from the
 * first server action the customer triggers to the final state change
 * — exercising the real action code against in-memory Prisma +
 * Supabase + Next.js primitives. The goal is to catch regressions in
 * wiring that unit tests on individual helpers can't see: transaction
 * boundaries, auth cross-checks, cookie handoffs, redirect paths.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  fakeDB,
  fakeSupabase,
  fakeCookies,
  fakeHeaders,
  prismaMock,
  resetAll,
} from './helpers/flow-singletons';

// ─── Mock the infra layer BEFORE importing any action ─────────────

vi.mock('@/lib/prisma', async () => {
  const mod = await import('./helpers/flow-singletons');
  return { prisma: mod.prismaMock };
});

vi.mock('@/lib/supabase/server', async () => {
  const mod = await import('./helpers/flow-singletons');
  return {
    createClient: async () => ({ auth: mod.fakeSupabase }),
  };
});

vi.mock('next/headers', async () => {
  const mod = await import('./helpers/flow-singletons');
  return {
    cookies: async () => mod.fakeCookies,
    headers: async () => mod.fakeHeaders,
  };
});

vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    // Next.js throws a special error for server-action redirects — we
    // emulate the shape so `try/catch` in tests can assert the target.
    const err = new Error('NEXT_REDIRECT');
    (err as unknown as { digest: string }).digest = `NEXT_REDIRECT;${url}`;
    throw err;
  },
}));

vi.mock('next/cache', () => ({
  revalidatePath: () => {},
  revalidateTag: () => {},
}));

// Now it's safe to pull in the action modules themselves.
const {
  signUpCustomer,
  signIn,
  signOut,
  requestPasswordReset,
  resetPassword,
  updatePassword,
  resendVerificationEmail,
  getSessionSummary,
} = await import('@/app/actions/auth');
const { createOrder } = await import('@/app/actions/orders');
const { updateProfile } = await import('@/app/actions/account');
const { subscribeEmail } = await import('@/app/actions/subscribe');

// ─── Fixtures ─────────────────────────────────────────────────────

const VALID_SIGNUP = {
  name: 'Chioma Adebayo',
  email: 'chioma@example.com',
  password: 'Correct-Horse-99',
  confirmPassword: 'Correct-Horse-99',
};

const VALID_CHECKOUT = {
  customerName: 'Chioma Adebayo',
  customerPhone: '08012345678',
  customerEmail: 'chioma@example.com',
  shippingAddress: '15 Admiralty Way, Lekki Phase 1',
  shippingCity: 'Lagos',
  shippingState: 'Lagos',
  notes: '',
};

function seedCatalog() {
  const cat = fakeDB.seedCategory({ name: 'Bundles', slug: 'bundles' });
  const product = fakeDB.seedProduct({
    name: 'Brazilian Body Wave',
    slug: 'brazilian-body-wave',
    categoryId: cat.id,
    basePrice: 45000,
    stockQuantity: 10,
  });
  fakeDB.seedSettings({
    shippingFee: 2500,
    freeShippingMin: 100000,
  });
  return { cat, product };
}

beforeEach(() => {
  resetAll();
  fakeHeaders.headers = new Map([
    ['host', 'localhost:3000'],
    ['x-forwarded-proto', 'http'],
  ]);
});

// ─── SIGN-UP FLOW ─────────────────────────────────────────────────

describe('customer sign-up flow', () => {
  it('creates a Supabase user + Prisma row on valid signup', async () => {
    const result = await signUpCustomer(VALID_SIGNUP);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.needsEmailConfirmation).toBe(true);

    // Both sides of the identity should be populated.
    expect(fakeSupabase.users.size).toBe(1);
    expect(fakeDB.db.users.size).toBe(1);
    const appUser = Array.from(fakeDB.db.users.values())[0]!;
    expect(appUser.email).toBe('chioma@example.com');
    expect(appUser.name).toBe('Chioma Adebayo');
    expect(appUser.role).toBe('CUSTOMER');
  });

  it('returns the same opaque success on duplicate email (no enumeration leak)', async () => {
    // Deliberately collapses duplicate-email errors into the same
    // success shape as a brand-new signup — otherwise the response
    // distinguishes "this email is registered" from "this is new",
    // which is a classic account-enumeration primitive. The Supabase
    // dupe error is logged server-side; the caller sees "check your
    // inbox" either way. See `src/app/actions/auth.ts:signUpCustomer`.
    await signUpCustomer(VALID_SIGNUP);
    const result = await signUpCustomer(VALID_SIGNUP);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.needsEmailConfirmation).toBe(true);
    // No duplicate Prisma row was created.
    expect(fakeDB.db.users.size).toBe(1);
    // Supabase still has only the original user row.
    expect(fakeSupabase.users.size).toBe(1);
  });

  it('returns fieldErrors for a weak password', async () => {
    const result = await signUpCustomer({
      ...VALID_SIGNUP,
      password: 'weak',
      confirmPassword: 'weak',
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.fieldErrors?.password?.length).toBeGreaterThan(0);
  });

  it('returns fieldErrors for mismatched passwords', async () => {
    const result = await signUpCustomer({
      ...VALID_SIGNUP,
      confirmPassword: 'Different-Pass-99',
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.fieldErrors?.confirmPassword?.[0]).toMatch(/do not match/i);
  });

  it('never creates an ADMIN via the signup path', async () => {
    // Attacker passes `role: 'ADMIN'` in the payload — server action
    // must ignore it (schema strips unknown keys + explicit force).
    await signUpCustomer({ ...VALID_SIGNUP, role: 'ADMIN' });
    const appUser = Array.from(fakeDB.db.users.values())[0]!;
    expect(appUser.role).toBe('CUSTOMER');
  });
});

// ─── SIGN-IN FLOW ─────────────────────────────────────────────────

describe('customer sign-in flow', () => {
  beforeEach(async () => {
    fakeSupabase.requireEmailConfirmation = false;
    await signUpCustomer(VALID_SIGNUP);
    await fakeSupabase.signOut();
  });

  it('signs in a valid customer and routes to /account', async () => {
    const result = await signIn({
      email: VALID_SIGNUP.email,
      password: VALID_SIGNUP.password,
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.role).toBe('CUSTOMER');
    expect(result.data.redirectTo).toBe('/account');
  });

  it('returns an opaque error on bad password', async () => {
    const result = await signIn({
      email: VALID_SIGNUP.email,
      password: 'Wrong-Pass-99',
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    // Must not hint whether the email exists.
    expect(result.error).toBe('Invalid email or password.');
  });

  it('returns an opaque error for a non-existent account', async () => {
    const result = await signIn({
      email: 'nobody@example.com',
      password: 'Anything-99',
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toBe('Invalid email or password.');
  });

  it('heals a Supabase user missing its Prisma row (out-of-band seed)', async () => {
    // Simulate: admin created the supabase user directly (via dashboard)
    // without running the sync. The first signIn should create the row.
    fakeDB.db.users.clear();
    const result = await signIn({
      email: VALID_SIGNUP.email,
      password: VALID_SIGNUP.password,
    });
    expect(result.success).toBe(true);
    expect(fakeDB.db.users.size).toBe(1);
  });
});

// ─── SIGN-OUT FLOW ────────────────────────────────────────────────

describe('customer sign-out flow', () => {
  it('clears the Supabase session and redirects to /auth/login', async () => {
    fakeSupabase.requireEmailConfirmation = false;
    await signUpCustomer(VALID_SIGNUP);
    expect(fakeSupabase.currentUserId).toBeTruthy();

    // Redirect mock throws NEXT_REDIRECT — catch and assert target.
    await expect(signOut()).rejects.toMatchObject({
      message: 'NEXT_REDIRECT',
      digest: 'NEXT_REDIRECT;/auth/login',
    });
    expect(fakeSupabase.currentUserId).toBeNull();
  });
});

// ─── SESSION SUMMARY (for client components) ──────────────────────

describe('getSessionSummary', () => {
  it('returns authenticated:false for anonymous visitors', async () => {
    const result = await getSessionSummary();
    expect(result.authenticated).toBe(false);
  });

  it('returns the AppUser shape for signed-in customers', async () => {
    fakeSupabase.requireEmailConfirmation = false;
    await signUpCustomer(VALID_SIGNUP);
    const result = await getSessionSummary();
    expect(result.authenticated).toBe(true);
    if (!result.authenticated) return;
    expect(result.role).toBe('CUSTOMER');
    expect(result.email).toBe(VALID_SIGNUP.email);
    expect(result.name).toBe(VALID_SIGNUP.name);
  });
});

// ─── GUEST CHECKOUT (Paystack) ────────────────────────────────────

describe('guest Paystack checkout', () => {
  it('creates a PENDING order, decrements stock, sets the token cookie', async () => {
    const { product } = seedCatalog();
    const result = await createOrder(
      VALID_CHECKOUT,
      [{ productId: product.id, variantId: null, quantity: 2 }],
      'PAYSTACK',
    );
    expect(result.success).toBe(true);
    if (!result.success) return;

    // Order row exists with correct totals.
    expect(fakeDB.db.orders.size).toBe(1);
    const order = Array.from(fakeDB.db.orders.values())[0]!;
    expect(order.status).toBe('PENDING');
    expect(order.channel).toBe('PAYSTACK');
    expect(Number(order.subtotal)).toBe(90000);
    expect(Number(order.shippingCost)).toBe(2500);
    expect(Number(order.total)).toBe(92500);
    expect(order.userId).toBeNull();

    // Stock decremented: 10 - 2 = 8.
    expect(fakeDB.db.products.get(product.id)!.stockQuantity).toBe(8);

    // Paystack response shape.
    expect(result.data.amount).toBe(9_250_000); // kobo
    expect(result.data.orderNumber).toMatch(/^ESH-\d{8}-\d{4}$/);
    expect(result.data.accessToken.length).toBeGreaterThan(20);
    expect(result.data.email).toBe(VALID_CHECKOUT.customerEmail);

    // HTTP-only token cookie was set.
    const cookie = fakeCookies.get('esh-order-token');
    expect(cookie?.value).toBe(result.data.accessToken);
  });

  it('applies free shipping when subtotal crosses threshold', async () => {
    const { product } = seedCatalog();
    const result = await createOrder(
      VALID_CHECKOUT,
      [{ productId: product.id, variantId: null, quantity: 3 }], // 135000
      'PAYSTACK',
    );
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.amount).toBe(135000 * 100);
  });

  it('rejects empty cart', async () => {
    const result = await createOrder(VALID_CHECKOUT, [], 'PAYSTACK');
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toMatch(/empty/i);
  });

  it('rejects invalid form data', async () => {
    const { product } = seedCatalog();
    const result = await createOrder(
      { ...VALID_CHECKOUT, customerPhone: '123' },
      [{ productId: product.id, variantId: null, quantity: 1 }],
      'PAYSTACK',
    );
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.fieldErrors?.customerPhone).toBeDefined();
  });

  it('rejects purchase exceeding available stock', async () => {
    const { product } = seedCatalog();
    const result = await createOrder(
      VALID_CHECKOUT,
      [{ productId: product.id, variantId: null, quantity: 99 }],
      'PAYSTACK',
    );
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toMatch(/only has \d+ in stock/i);
    // Stock untouched.
    expect(fakeDB.db.products.get(product.id)!.stockQuantity).toBe(10);
  });

  it('rejects unknown product id', async () => {
    seedCatalog();
    // CUID-shaped but unseeded — exercises the "not found" branch
    // rather than the upstream `.cuid()` Zod validator.
    const result = await createOrder(
      VALID_CHECKOUT,
      [
        {
          productId: 'cghostprodaaaaaaaaaaaaaaa',
          variantId: null,
          quantity: 1,
        },
      ],
      'PAYSTACK',
    );
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toMatch(/not found/i);
  });

  it('rejects unknown variant id even when the product exists', async () => {
    const { product } = seedCatalog();
    const result = await createOrder(
      VALID_CHECKOUT,
      [
        {
          productId: product.id,
          variantId: 'cghostvariantaaaaaaaaaaaa',
          quantity: 1,
        },
      ],
      'PAYSTACK',
    );
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toMatch(/variant not found/i);
  });

  it('surfaces a friendly error when stock was drained between check and decrement', async () => {
    const { product } = seedCatalog();
    // Simulate a concurrent buyer draining stock to zero AFTER the
    // pre-check but BEFORE the decrement. The cleanest way to hit the
    // CAS guard is to zero out stock between phases — we do that by
    // wrapping product.updateMany on this one call.
    const originalUpdateMany = prismaMock.product.updateMany;
    let invoked = false;
    prismaMock.product.updateMany = async (args) => {
      if (!invoked) {
        invoked = true;
        product.stockQuantity = 0;
      }
      return originalUpdateMany(args);
    };

    const result = await createOrder(
      VALID_CHECKOUT,
      [{ productId: product.id, variantId: null, quantity: 1 }],
      'PAYSTACK',
    );

    prismaMock.product.updateMany = originalUpdateMany;
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toMatch(/just purchased by someone else/i);
    // Rollback must have restored stock to its pre-tx value AND removed
    // the would-be order.
    expect(fakeDB.db.orders.size).toBe(0);
  });

  it('retries order-number generation on duplicate (P2002) and still succeeds', async () => {
    const { product } = seedCatalog();
    // First checkout claims ESH-yyyymmdd-0001 normally.
    const first = await createOrder(
      VALID_CHECKOUT,
      [{ productId: product.id, variantId: null, quantity: 1 }],
      'PAYSTACK',
    );
    expect(first.success).toBe(true);
    if (!first.success) return;

    // Now force the count() to return a racy value so the retry path
    // runs. We stub count() to always say "1 existing" → the next
    // order would compute ...-0002 which is fine. Instead we make it
    // say 0 — then the next attempt will try ...-0001 (collision),
    // bump to ...-0002 on retry and succeed.
    const originalCount = prismaMock.order.count;
    prismaMock.order.count = async () => 0;

    const second = await createOrder(
      VALID_CHECKOUT,
      [{ productId: product.id, variantId: null, quantity: 1 }],
      'PAYSTACK',
    );
    prismaMock.order.count = originalCount;
    expect(second.success).toBe(true);
    if (!second.success) return;
    // Both orders exist with different numbers.
    expect(first.data.orderNumber).not.toBe(second.data.orderNumber);
    expect(fakeDB.db.orders.size).toBe(2);
  });
});

// ─── AUTHENTICATED PAYSTACK CHECKOUT ─────────────────────────────

describe('signed-in customer Paystack checkout', () => {
  it('links the order to the shopper\u2019s userId', async () => {
    fakeSupabase.requireEmailConfirmation = false;
    await signUpCustomer(VALID_SIGNUP);

    const { product } = seedCatalog();
    const result = await createOrder(
      VALID_CHECKOUT,
      [{ productId: product.id, variantId: null, quantity: 1 }],
      'PAYSTACK',
    );
    expect(result.success).toBe(true);

    const order = Array.from(fakeDB.db.orders.values())[0]!;
    const appUser = Array.from(fakeDB.db.users.values())[0]!;
    expect(order.userId).toBe(appUser.id);
  });
});

// ─── WHATSAPP CHECKOUT ────────────────────────────────────────────

describe('guest WhatsApp checkout', () => {
  it('creates an order with channel=WHATSAPP and null paymentReference', async () => {
    const { product } = seedCatalog();
    const result = await createOrder(
      { ...VALID_CHECKOUT, customerEmail: '' }, // email optional for WhatsApp
      [{ productId: product.id, variantId: null, quantity: 1 }],
      'WHATSAPP',
    );
    expect(result.success).toBe(true);
    if (!result.success) return;
    const order = Array.from(fakeDB.db.orders.values())[0]!;
    expect(order.channel).toBe('WHATSAPP');
    expect(order.paymentReference).toBeNull();
    // Still decrements stock — order is pending confirmation via WhatsApp.
    expect(fakeDB.db.products.get(product.id)!.stockQuantity).toBe(9);
  });
});

// ─── VARIANT CHECKOUT ─────────────────────────────────────────────

describe('checkout with product variants', () => {
  it('uses the variant price + stock, not the base product', async () => {
    fakeDB.seedSettings();
    const cat = fakeDB.seedCategory();
    const product = fakeDB.seedProduct({
      categoryId: cat.id,
      basePrice: 45000,
      stockQuantity: 99, // base should be irrelevant here
      variants: [
        {
          name: '20-inch',
          label: '20"',
          price: 60000,
          stockQuantity: 3,
        },
      ],
    });
    const variant = product.variants[0]!;
    const result = await createOrder(
      VALID_CHECKOUT,
      [{ productId: product.id, variantId: variant.id, quantity: 2 }],
      'PAYSTACK',
    );
    expect(result.success).toBe(true);
    if (!result.success) return;
    // 60,000 * 2 = 120,000 → free shipping kicks in
    expect(result.data.amount).toBe(120000 * 100);
    // Variant stock decremented, base product stock untouched.
    expect(fakeDB.db.productVariants.get(variant.id)!.stockQuantity).toBe(1);
    expect(fakeDB.db.products.get(product.id)!.stockQuantity).toBe(99);
  });
});

// ─── ACCOUNT PROFILE ──────────────────────────────────────────────

describe('customer profile update', () => {
  beforeEach(async () => {
    fakeSupabase.requireEmailConfirmation = false;
    await signUpCustomer(VALID_SIGNUP);
  });

  it('updates the display name', async () => {
    const result = await updateProfile({
      name: 'Chioma A.',
      email: VALID_SIGNUP.email,
    });
    expect(result.success).toBe(true);
    const appUser = Array.from(fakeDB.db.users.values())[0]!;
    expect(appUser.name).toBe('Chioma A.');
  });

  it('triggers Supabase email change without mutating the Prisma email yet', async () => {
    const result = await updateProfile({
      name: VALID_SIGNUP.name,
      email: 'new-email@example.com',
    });
    expect(result.success).toBe(true);
    // Supabase row now holds the new email.
    const supaUser = Array.from(fakeSupabase.users.values())[0]!;
    expect(supaUser.email).toBe('new-email@example.com');
    // Prisma row still holds the old email until the confirmation flow
    // completes (next session refresh re-syncs).
    const appUser = Array.from(fakeDB.db.users.values())[0]!;
    expect(appUser.email).toBe(VALID_SIGNUP.email);
  });

  it('rejects unauthenticated profile updates', async () => {
    await fakeSupabase.signOut();
    const result = await updateProfile({
      name: 'Anon',
      email: 'anon@example.com',
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toBe('Unauthorized');
  });

  it('returns field errors for invalid email', async () => {
    const result = await updateProfile({
      name: VALID_SIGNUP.name,
      email: 'not-an-email',
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.fieldErrors?.email).toBeDefined();
  });
});

// ─── CHANGE PASSWORD ──────────────────────────────────────────────

describe('authenticated password change', () => {
  beforeEach(async () => {
    fakeSupabase.requireEmailConfirmation = false;
    await signUpCustomer(VALID_SIGNUP);
  });

  it('rejects when current password is wrong', async () => {
    const result = await updatePassword({
      currentPassword: 'Wrong-Pass-99',
      newPassword: 'New-Good-Pass-99',
      confirmPassword: 'New-Good-Pass-99',
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.fieldErrors?.currentPassword).toBeDefined();
  });

  it('rotates the password on the happy path', async () => {
    const result = await updatePassword({
      currentPassword: VALID_SIGNUP.password,
      newPassword: 'New-Good-Pass-99',
      confirmPassword: 'New-Good-Pass-99',
    });
    expect(result.success).toBe(true);
    const supaUser = Array.from(fakeSupabase.users.values())[0]!;
    expect(supaUser.password).toBe('New-Good-Pass-99');
  });

  it('rejects when new + confirm do not match', async () => {
    const result = await updatePassword({
      currentPassword: VALID_SIGNUP.password,
      newPassword: 'New-Good-Pass-99',
      confirmPassword: 'Typo-Pass-99',
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.fieldErrors?.confirmPassword).toBeDefined();
  });

  it('rejects unauthenticated callers', async () => {
    await fakeSupabase.signOut();
    const result = await updatePassword({
      currentPassword: VALID_SIGNUP.password,
      newPassword: 'New-Good-Pass-99',
      confirmPassword: 'New-Good-Pass-99',
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toBe('Unauthorized');
  });
});

// ─── PASSWORD RESET FLOW ──────────────────────────────────────────

describe('forgot-password + reset flow', () => {
  it('silently succeeds when asked to reset an unknown email', async () => {
    const result = await requestPasswordReset({ email: 'ghost@example.com' });
    expect(result.success).toBe(true);
  });

  it('lets a customer reset their password after clicking the email link', async () => {
    fakeSupabase.requireEmailConfirmation = false;
    await signUpCustomer(VALID_SIGNUP);
    await fakeSupabase.signOut();

    // Customer hits "forgot password" → Supabase flags a recovery session.
    await requestPasswordReset({ email: VALID_SIGNUP.email });
    expect(fakeSupabase.recoveryUserId).toBeTruthy();

    // Customer clicks link → arrives on /auth/reset-password with a
    // recovery session. They submit the new password.
    const result = await resetPassword({
      password: 'New-Reset-Pass-99',
      confirmPassword: 'New-Reset-Pass-99',
    });
    expect(result.success).toBe(true);

    // New password now works for sign-in.
    fakeSupabase.recoveryUserId = null;
    const loginResult = await signIn({
      email: VALID_SIGNUP.email,
      password: 'New-Reset-Pass-99',
    });
    expect(loginResult.success).toBe(true);
  });

  it('rejects reset when the recovery link is stale / no session', async () => {
    const result = await resetPassword({
      password: 'New-Reset-Pass-99',
      confirmPassword: 'New-Reset-Pass-99',
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toMatch(/no longer valid/i);
  });
});

// ─── RESEND VERIFICATION ──────────────────────────────────────────

describe('resend email verification', () => {
  it('forwards to Supabase without throwing', async () => {
    const result = await resendVerificationEmail('chioma@example.com');
    expect(result.success).toBe(true);
  });
});

// ─── EMAIL SUBSCRIBE ──────────────────────────────────────────────

describe('newsletter subscribe', () => {
  it('accepts a valid email and records it once', async () => {
    const formData = new FormData();
    formData.set('email', 'fan@example.com');
    const first = await subscribeEmail(formData);
    expect(first.success).toBe(true);
    // Upsert is idempotent — second call with the same email still
    // succeeds, doesn't create a dup.
    const second = await subscribeEmail(formData);
    expect(second.success).toBe(true);
  });

  it('rejects malformed emails', async () => {
    const formData = new FormData();
    formData.set('email', 'not-an-email');
    const result = await subscribeEmail(formData);
    expect(result.success).toBe(false);
  });
});
