/**
 * End-to-end flow tests for every ADMIN journey.
 *
 * These exercise the full admin server-action surface: product CRUD,
 * category CRUD, order status transitions (with stock restore on
 * cancel), store settings, and the authorization gate that keeps
 * customers out of admin-only actions.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fakeDB, fakeSupabase, resetAll } from './helpers/flow-singletons';

vi.mock('@/lib/prisma', async () => {
  const mod = await import('./helpers/flow-singletons');
  return { prisma: mod.prismaMock };
});

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

vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    const err = new Error('NEXT_REDIRECT');
    (err as unknown as { digest: string }).digest = `NEXT_REDIRECT;${url}`;
    throw err;
  },
}));

vi.mock('next/cache', () => ({
  revalidatePath: () => {},
  revalidateTag: () => {},
}));

const { signIn, signUpCustomer } = await import('@/app/actions/auth');
const { createProduct, updateProduct, deleteProduct } =
  await import('@/app/actions/products');
const { createCategory, updateCategory } =
  await import('@/app/actions/categories');
const { createOrder, updateOrderStatus, updateOrderNotes } =
  await import('@/app/actions/orders');
const { updateStoreSettings } = await import('@/app/actions/settings');

// ─── Helpers ──────────────────────────────────────────────────────

const ADMIN_EMAIL = 'admin@eshair.com';
const ADMIN_PASSWORD = 'Admin-Pass-99';

/** Seed a ready-to-use admin and sign them in. */
async function seedAdminAndSignIn() {
  // Provisioned via the admin script: Supabase user first, then the
  // Prisma User row with role ADMIN.
  fakeSupabase.requireEmailConfirmation = false;
  const supa = fakeSupabase.seedUser(ADMIN_EMAIL, ADMIN_PASSWORD, {
    emailConfirmed: true,
  });
  fakeDB.seedUser({
    id: supa.id,
    email: ADMIN_EMAIL,
    name: 'Store Admin',
    role: 'ADMIN',
  });
  const result = await signIn({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  if (!result.success) throw new Error('Admin sign-in failed in test setup');
}

async function seedCustomerAndSignIn(
  email = 'cust@example.com',
  password = 'Cust-Pass-99',
) {
  fakeSupabase.requireEmailConfirmation = false;
  await signUpCustomer({
    name: 'Customer User',
    email,
    password,
    confirmPassword: password,
  });
}

const VALID_PRODUCT_FORM = {
  name: 'Brazilian Body Wave',
  description: 'Lush 100% Brazilian virgin hair, cuticle aligned.',
  shortDescription: 'Top-grade body wave bundles',
  categoryId: '', // filled per-test with a real seeded id
  basePrice: 45000,
  compareAtPrice: 55000,
  sku: 'BRZ-BODY-WAVE',
  stockQuantity: 10,
  isActive: true,
  isFeatured: false,
  tags: 'brazilian, body-wave',
};

const VALID_SETTINGS = {
  storeName: 'Emmanuel Sarah Hair',
  storeEmail: 'hello@eshair.com',
  storePhone: '08012345678',
  whatsappNumber: '2348012345678',
  shippingFee: 2500,
  freeShippingMin: 100000,
  announcementBar: 'Free shipping above ₦100,000',
  isMaintenanceMode: false,
};

beforeEach(() => {
  resetAll();
});

// ─── AUTH GATE ────────────────────────────────────────────────────

describe('admin authorization gate', () => {
  it('an anonymous caller cannot createProduct', async () => {
    const cat = fakeDB.seedCategory({ name: 'Bundles', slug: 'bundles' });
    const result = await createProduct(
      { ...VALID_PRODUCT_FORM, categoryId: cat.id },
      [],
      [],
    );
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toBe('Unauthorized');
  });

  it('a CUSTOMER cannot createProduct even when signed in', async () => {
    await seedCustomerAndSignIn();
    const cat = fakeDB.seedCategory({ name: 'Bundles', slug: 'bundles' });
    const result = await createProduct(
      { ...VALID_PRODUCT_FORM, categoryId: cat.id },
      [],
      [],
    );
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toBe('Unauthorized');
  });

  it('a CUSTOMER cannot updateOrderStatus', async () => {
    await seedCustomerAndSignIn();
    const result = await updateOrderStatus('any-id', { status: 'CONFIRMED' });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toBe('Unauthorized');
  });

  it('a CUSTOMER cannot updateStoreSettings', async () => {
    await seedCustomerAndSignIn();
    const result = await updateStoreSettings(VALID_SETTINGS);
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toBe('Unauthorized');
  });

  it('a CUSTOMER cannot createCategory', async () => {
    await seedCustomerAndSignIn();
    const result = await createCategory({ name: 'Bundles', description: '' });
    expect(result.success).toBe(false);
  });
});

// ─── CATEGORY CRUD ────────────────────────────────────────────────

describe('admin category CRUD', () => {
  beforeEach(async () => {
    await seedAdminAndSignIn();
  });

  it('creates a category with an auto-assigned sortOrder', async () => {
    const result = await createCategory({
      name: 'Bundles',
      description: 'Hair bundles',
    });
    expect(result.success).toBe(true);
    expect(fakeDB.db.categories.size).toBe(1);
    const cat = Array.from(fakeDB.db.categories.values())[0];
    expect(cat.name).toBe('Bundles');
    expect(cat.slug).toBe('bundles');
    expect(cat.sortOrder).toBe(1);
  });

  it('increments sortOrder for subsequent categories', async () => {
    await createCategory({ name: 'Bundles', description: '' });
    await createCategory({ name: 'Closures', description: '' });
    const cats = Array.from(fakeDB.db.categories.values()).sort(
      (a, b) => a.sortOrder - b.sortOrder,
    );
    expect(cats.map((c) => c.sortOrder)).toEqual([1, 2]);
  });

  it('rejects a duplicate category name with a friendly error', async () => {
    await createCategory({ name: 'Bundles', description: '' });
    const result = await createCategory({ name: 'Bundles', description: 'x' });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toMatch(/already exists/i);
  });

  it('updates an existing category', async () => {
    const created = await createCategory({ name: 'Bundles', description: '' });
    if (!created.success) throw new Error('setup failed');
    const result = await updateCategory(created.data.id, {
      name: 'Hair Bundles',
      description: 'Top-grade',
    });
    expect(result.success).toBe(true);
    const cat = fakeDB.db.categories.get(created.data.id)!;
    expect(cat.name).toBe('Hair Bundles');
    expect(cat.slug).toBe('hair-bundles');
    expect(cat.description).toBe('Top-grade');
  });

  it('returns fieldErrors for invalid category input', async () => {
    const result = await createCategory({ name: 'a', description: '' }); // too short
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.fieldErrors?.name).toBeDefined();
  });
});

// ─── PRODUCT CRUD ────────────────────────────────────────────────

describe('admin product CRUD', () => {
  beforeEach(async () => {
    await seedAdminAndSignIn();
  });

  it('creates a product with variants + images', async () => {
    const cat = fakeDB.seedCategory({ name: 'Bundles', slug: 'bundles' });
    const result = await createProduct(
      { ...VALID_PRODUCT_FORM, categoryId: cat.id },
      [
        {
          url: 'https://img.example/a.jpg',
          publicId: 'a',
          sortOrder: 0,
          isPrimary: true,
        },
      ],
      [
        {
          name: '18-inch',
          label: '18"',
          price: 45000,
          stockQuantity: 5,
        },
      ],
    );
    expect(result.success).toBe(true);
    if (!result.success) return;

    const product = fakeDB.db.products.get(result.data.id)!;
    expect(product.name).toBe(VALID_PRODUCT_FORM.name);
    expect(product.slug).toBe('brazilian-body-wave');
    expect(product.tags).toEqual(['brazilian', 'body-wave']);
    expect(product.variants.length).toBe(1);
    expect(product.images.length).toBe(1);
  });

  it('rejects invalid product input', async () => {
    const cat = fakeDB.seedCategory({ name: 'Bundles', slug: 'bundles' });
    const result = await createProduct(
      {
        ...VALID_PRODUCT_FORM,
        categoryId: cat.id,
        name: 'x', // too short
        basePrice: -1, // not positive
      },
      [],
      [],
    );
    expect(result.success).toBe(false);
  });

  it('updates a product and replaces its images + variants', async () => {
    const cat = fakeDB.seedCategory({ name: 'Bundles', slug: 'bundles' });
    const product = fakeDB.seedProduct({
      categoryId: cat.id,
      name: 'Old Name',
      slug: 'old-name',
      variants: [{ name: 'v1', label: '12"', price: 30000, stockQuantity: 5 }],
      images: [{ url: 'https://img.example/old.jpg', publicId: 'old' }],
    });
    const result = await updateProduct(
      product.id,
      { ...VALID_PRODUCT_FORM, categoryId: cat.id, name: 'New Name' },
      [
        {
          url: 'https://img.example/new.jpg',
          publicId: 'new',
          sortOrder: 0,
          isPrimary: true,
        },
      ],
      [
        {
          name: '20-inch',
          label: '20"',
          price: 55000,
          stockQuantity: 8,
        },
      ],
    );
    expect(result.success).toBe(true);
    const updated = fakeDB.db.products.get(product.id)!;
    expect(updated.name).toBe('New Name');
    expect(updated.slug).toBe('new-name');
    expect(updated.variants.length).toBe(1);
    expect(updated.variants[0].label).toBe('20"');
    expect(updated.images.length).toBe(1);
    expect(updated.images[0].publicId).toBe('new');
  });

  it('soft-deletes a product by flipping isActive', async () => {
    const cat = fakeDB.seedCategory({ name: 'Bundles', slug: 'bundles' });
    const product = fakeDB.seedProduct({ categoryId: cat.id });
    const result = await deleteProduct(product.id);
    expect(result.success).toBe(true);
    const row = fakeDB.db.products.get(product.id)!;
    expect(row.isActive).toBe(false);
  });
});

// ─── ORDER STATUS TRANSITIONS ─────────────────────────────────────

describe('admin order status transitions', () => {
  beforeEach(async () => {
    await seedAdminAndSignIn();
  });

  async function seedOrderForTest(qty = 2) {
    const cat = fakeDB.seedCategory({ name: 'Bundles', slug: 'bundles' });
    const product = fakeDB.seedProduct({
      categoryId: cat.id,
      stockQuantity: 10,
      basePrice: 45000,
    });
    fakeDB.seedSettings({
      shippingFee: 2500,
      freeShippingMin: 100000,
    });

    // Sign out admin → place order anonymously → re-sign-in as admin.
    await fakeSupabase.signOut();
    const result = await createOrder(
      {
        customerName: 'Test Customer',
        customerPhone: '08012345678',
        customerEmail: 'test@example.com',
        shippingAddress: '10 Demo Street',
        shippingCity: 'Lagos',
        shippingState: 'Lagos',
      },
      [{ productId: product.id, variantId: null, quantity: qty }],
      'PAYSTACK',
    );
    if (!result.success) throw new Error('Order creation failed in setup');
    await signIn({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
    const order = Array.from(fakeDB.db.orders.values())[0];
    return { product, order };
  }

  it('moves PENDING → CONFIRMED without touching stock', async () => {
    const { product, order } = await seedOrderForTest(2);
    const stockBefore = fakeDB.db.products.get(product.id)!.stockQuantity;
    const result = await updateOrderStatus(order.id, { status: 'CONFIRMED' });
    expect(result.success).toBe(true);
    const updated = fakeDB.db.orders.get(order.id)!;
    expect(updated.status).toBe('CONFIRMED');
    expect(fakeDB.db.products.get(product.id)!.stockQuantity).toBe(stockBefore);
  });

  it('restores stock when CANCELLING an order', async () => {
    const { product, order } = await seedOrderForTest(3);
    // After create, product stock is 10 - 3 = 7.
    expect(fakeDB.db.products.get(product.id)!.stockQuantity).toBe(7);
    const result = await updateOrderStatus(order.id, { status: 'CANCELLED' });
    expect(result.success).toBe(true);
    // Stock restored to 10.
    expect(fakeDB.db.products.get(product.id)!.stockQuantity).toBe(10);
    expect(fakeDB.db.orders.get(order.id)!.status).toBe('CANCELLED');
  });

  it('does not double-restore stock on repeat CANCELLED updates', async () => {
    const { product, order } = await seedOrderForTest(3);
    await updateOrderStatus(order.id, { status: 'CANCELLED' });
    expect(fakeDB.db.products.get(product.id)!.stockQuantity).toBe(10);
    // Second CANCELLED update — status already CANCELLED, skip restore.
    await updateOrderStatus(order.id, { status: 'CANCELLED' });
    expect(fakeDB.db.products.get(product.id)!.stockQuantity).toBe(10);
  });

  it('updates admin-only notes', async () => {
    const { order } = await seedOrderForTest(1);
    const result = await updateOrderNotes(order.id, 'VIP — ship same day');
    expect(result.success).toBe(true);
    expect(fakeDB.db.orders.get(order.id)!.adminNotes).toBe(
      'VIP — ship same day',
    );
  });

  it('returns Order not found for an unknown id', async () => {
    const result = await updateOrderStatus('ghost-order', {
      status: 'SHIPPED',
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toMatch(/not found/i);
  });
});

// ─── STORE SETTINGS ──────────────────────────────────────────────

describe('admin store settings', () => {
  beforeEach(async () => {
    await seedAdminAndSignIn();
  });

  it('creates store settings on first save (upsert)', async () => {
    const result = await updateStoreSettings(VALID_SETTINGS);
    expect(result.success).toBe(true);
    const row = fakeDB.db.storeSettings.get('default')!;
    expect(row.storeName).toBe(VALID_SETTINGS.storeName);
    expect(Number(row.shippingFee)).toBe(2500);
    expect(Number(row.freeShippingMin)).toBe(100000);
  });

  it('updates existing settings on second save', async () => {
    await updateStoreSettings(VALID_SETTINGS);
    const result = await updateStoreSettings({
      ...VALID_SETTINGS,
      storeName: 'Renamed Store',
      shippingFee: 3000,
      isMaintenanceMode: true,
    });
    expect(result.success).toBe(true);
    const row = fakeDB.db.storeSettings.get('default')!;
    expect(row.storeName).toBe('Renamed Store');
    expect(Number(row.shippingFee)).toBe(3000);
    expect(row.isMaintenanceMode).toBe(true);
  });

  it('rejects invalid settings (negative shipping fee)', async () => {
    const result = await updateStoreSettings({
      ...VALID_SETTINGS,
      shippingFee: -50,
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.fieldErrors?.shippingFee).toBeDefined();
  });
});

// ─── ADMIN SIGN-IN ROUTING ────────────────────────────────────────

describe('admin sign-in routing', () => {
  it('routes admins to /admin and CUSTOMERS to /account', async () => {
    // Admin
    fakeSupabase.requireEmailConfirmation = false;
    const admin = fakeSupabase.seedUser(ADMIN_EMAIL, ADMIN_PASSWORD);
    fakeDB.seedUser({ id: admin.id, email: ADMIN_EMAIL, role: 'ADMIN' });
    const adminResult = await signIn({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    });
    expect(adminResult.success).toBe(true);
    if (adminResult.success) expect(adminResult.data.redirectTo).toBe('/admin');

    // Customer
    await fakeSupabase.signOut();
    fakeSupabase.seedUser('cust@example.com', 'Cust-Pass-99');
    const cust = Array.from(fakeSupabase.users.values()).find(
      (u) => u.email === 'cust@example.com',
    )!;
    fakeDB.seedUser({
      id: cust.id,
      email: 'cust@example.com',
      role: 'CUSTOMER',
    });
    const custResult = await signIn({
      email: 'cust@example.com',
      password: 'Cust-Pass-99',
    });
    expect(custResult.success).toBe(true);
    if (custResult.success) expect(custResult.data.redirectTo).toBe('/account');
  });
});
