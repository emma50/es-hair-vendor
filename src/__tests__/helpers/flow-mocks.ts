/**
 * In-memory fake Prisma, Supabase, and Next.js primitives for flow tests.
 *
 * These fakes implement just enough of each library's surface area to
 * exercise the server actions end-to-end without touching a real
 * database or auth server. The philosophy: behave realistically for the
 * happy path + the specific error modes our actions care about, and
 * throw on anything unexpected so tests fail loudly when a new
 * action/path needs coverage.
 */

import { Prisma } from '@prisma/client';
import type {
  User as AppUser,
  Category,
  Product,
  ProductVariant,
  ProductImage,
  Order,
  OrderItem,
  StoreSettings,
  EmailSubscriber,
  OrderStatus,
  UserRole,
} from '@prisma/client';

type ProcessedWebhookEventRow = {
  id: string;
  paystackEventId: string;
  eventType: string;
  processedAt: Date;
};

type DBShape = {
  users: Map<string, AppUser>;
  categories: Map<string, Category>;
  products: Map<
    string,
    Product & { images: ProductImage[]; variants: ProductVariant[] }
  >;
  productImages: Map<string, ProductImage>;
  productVariants: Map<string, ProductVariant>;
  orders: Map<string, Order & { items: OrderItem[] }>;
  orderItems: Map<string, OrderItem>;
  storeSettings: Map<string, StoreSettings>;
  emailSubscribers: Map<string, EmailSubscriber>;
  processedWebhookEvents: Map<string, ProcessedWebhookEventRow>;
};

type SupabaseUser = {
  id: string;
  email: string;
  password: string;
  emailConfirmed: boolean;
  metadata?: Record<string, unknown>;
};

/** Variant seed input — accepts plain numbers for Decimal fields. */
export type VariantSeedInput = Omit<Partial<ProductVariant>, 'price'> & {
  price?: number;
};

/**
 * Generate a Prisma-CUID-shaped id for the fake DB. Real Prisma uses
 * `@default(cuid())` for every primary key in this schema, and the
 * server actions validate cart line items via Zod's `.cuid()` matcher.
 * The previous `${prefix}_${random}` scheme failed that check (the
 * format isn't CUID-shaped) and made checkout actions reject every
 * fake product. CUID classic = "c" + 24 lowercase alphanumerics.
 *
 * `prefix` is preserved as a leading marker for grep-ability in test
 * failures — the `c…` part still satisfies the validator because
 * we cap the alphabet to lowercase letters/digits and pad to length.
 */
function makeId(prefix: string) {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let body = '';
  // Mix in a short prefix tag (lowercase, alpha-only) so the prefix
  // is searchable but doesn't break CUID character-class rules.
  const tag = prefix
    .toLowerCase()
    .replace(/[^a-z]/g, '')
    .slice(0, 4)
    .padEnd(4, 'a');
  body += tag;
  while (body.length < 24) {
    body += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `c${body}`;
}

/** In-memory DB shared across a single test's run. */
export class FakeDB {
  db: DBShape = {
    users: new Map(),
    categories: new Map(),
    products: new Map(),
    productImages: new Map(),
    productVariants: new Map(),
    orders: new Map(),
    orderItems: new Map(),
    storeSettings: new Map(),
    emailSubscribers: new Map(),
    processedWebhookEvents: new Map(),
  };

  reset() {
    for (const key of Object.keys(this.db) as (keyof DBShape)[]) {
      (this.db[key] as Map<string, unknown>).clear();
    }
  }

  /** Seed a category and return it. */
  seedCategory(overrides: Partial<Category> = {}): Category {
    const id = overrides.id ?? makeId('cat');
    const cat: Category = {
      id,
      name: overrides.name ?? `Category ${id}`,
      slug: overrides.slug ?? id,
      description: overrides.description ?? null,
      image: overrides.image ?? null,
      sortOrder: overrides.sortOrder ?? 0,
      isActive: overrides.isActive ?? true,
      createdAt: overrides.createdAt ?? new Date(),
      updatedAt: overrides.updatedAt ?? new Date(),
    };
    this.db.categories.set(id, cat);
    return cat;
  }

  /** Seed a product (+ optional variants/images) and return it. */
  seedProduct(
    overrides: Omit<Partial<Product>, 'basePrice' | 'compareAtPrice'> & {
      basePrice?: number;
      compareAtPrice?: number | null;
      variants?: VariantSeedInput[];
      images?: Partial<ProductImage>[];
    } = {},
  ) {
    const id = overrides.id ?? makeId('prod');
    const product = {
      id,
      name: overrides.name ?? `Product ${id}`,
      slug: overrides.slug ?? id,
      description: overrides.description ?? 'Test product description.',
      shortDescription: overrides.shortDescription ?? null,
      categoryId: overrides.categoryId ?? this.seedCategory().id,
      basePrice: (overrides.basePrice ??
        45000) as unknown as Product['basePrice'],
      compareAtPrice: (overrides.compareAtPrice ?? null) as unknown as
        | Product['compareAtPrice']
        | null,
      currency: overrides.currency ?? 'NGN',
      sku: overrides.sku ?? null,
      stockQuantity: overrides.stockQuantity ?? 10,
      isActive: overrides.isActive ?? true,
      isFeatured: overrides.isFeatured ?? false,
      tags: overrides.tags ?? [],
      metadata: overrides.metadata ?? null,
      createdAt: overrides.createdAt ?? new Date(),
      updatedAt: overrides.updatedAt ?? new Date(),
      variants: [] as ProductVariant[],
      images: [] as ProductImage[],
    };
    for (const v of overrides.variants ?? []) {
      const vid = v.id ?? makeId('var');
      const variant: ProductVariant = {
        id: vid,
        productId: id,
        name: v.name ?? `Variant ${vid}`,
        label: v.label ?? 'Default',
        price: (v.price ??
          overrides.basePrice ??
          45000) as unknown as ProductVariant['price'],
        stockQuantity: v.stockQuantity ?? 5,
        sku: v.sku ?? null,
        isActive: v.isActive ?? true,
        metadata: v.metadata ?? null,
      };
      product.variants.push(variant);
      this.db.productVariants.set(vid, variant);
    }
    for (const img of overrides.images ?? []) {
      const iid = img.id ?? makeId('img');
      const image: ProductImage = {
        id: iid,
        productId: id,
        url: img.url ?? 'https://example.com/img.jpg',
        publicId: img.publicId ?? 'pub_id',
        alt: img.alt ?? null,
        width: img.width ?? null,
        height: img.height ?? null,
        sortOrder: img.sortOrder ?? 0,
        isPrimary: img.isPrimary ?? false,
      };
      product.images.push(image);
      this.db.productImages.set(iid, image);
    }
    this.db.products.set(id, product);
    return product;
  }

  /** Seed an application user. */
  seedUser(overrides: Partial<AppUser> = {}): AppUser {
    const id = overrides.id ?? makeId('user');
    const user: AppUser = {
      id,
      email: overrides.email ?? `${id}@example.com`,
      name: overrides.name ?? null,
      role: overrides.role ?? ('CUSTOMER' as UserRole),
      createdAt: overrides.createdAt ?? new Date(),
      updatedAt: overrides.updatedAt ?? new Date(),
    };
    this.db.users.set(id, user);
    return user;
  }

  /** Seed store settings. Decimal fields accept plain numbers. */
  seedSettings(
    overrides: Omit<
      Partial<StoreSettings>,
      'shippingFee' | 'freeShippingMin'
    > & {
      shippingFee?: number;
      freeShippingMin?: number | null;
    } = {},
  ): StoreSettings {
    const s: StoreSettings = {
      id: 'default',
      storeName: overrides.storeName ?? 'Emmanuel Sarah Hair',
      storeEmail: overrides.storeEmail ?? null,
      storePhone: overrides.storePhone ?? null,
      whatsappNumber: overrides.whatsappNumber ?? null,
      currency: overrides.currency ?? 'NGN',
      shippingFee: (overrides.shippingFee ??
        2500) as unknown as StoreSettings['shippingFee'],
      freeShippingMin: (overrides.freeShippingMin ??
        50000) as unknown as StoreSettings['freeShippingMin'],
      announcementBar: overrides.announcementBar ?? null,
      isMaintenanceMode: overrides.isMaintenanceMode ?? false,
      metadata: overrides.metadata ?? null,
      updatedAt: overrides.updatedAt ?? new Date(),
    };
    this.db.storeSettings.set('default', s);
    return s;
  }
}

/** Prisma-shaped mock backed by FakeDB. */
export function makePrismaMock(fake: FakeDB) {
  const db = fake.db;

  const user = {
    findUnique: async ({
      where,
    }: {
      where: { id?: string; email?: string };
    }) => {
      if (where.id) return db.users.get(where.id) ?? null;
      if (where.email) {
        for (const u of db.users.values()) {
          if (u.email === where.email) return u;
        }
      }
      return null;
    },
    create: async ({ data }: { data: AppUser }) => {
      if (db.users.has(data.id)) throw new Error('Unique constraint: user.id');
      const now = new Date();
      const row: AppUser = {
        id: data.id,
        email: data.email,
        name: data.name ?? null,
        role: data.role ?? ('CUSTOMER' as UserRole),
        createdAt: now,
        updatedAt: now,
      };
      db.users.set(row.id, row);
      return row;
    },
    update: async ({
      where,
      data,
    }: {
      where: { id: string };
      data: Partial<AppUser>;
    }) => {
      const existing = db.users.get(where.id);
      if (!existing) throw new Error('Not found');
      const updated = {
        ...existing,
        ...data,
        updatedAt: new Date(),
      } as AppUser;
      db.users.set(where.id, updated);
      return updated;
    },
  };

  const category = {
    findMany: async () => Array.from(db.categories.values()),
    aggregate: async ({ _max }: { _max?: { sortOrder?: boolean } }) => {
      if (!_max?.sortOrder) return { _max: {} };
      let max: number | null = null;
      for (const c of db.categories.values()) {
        if (max === null || c.sortOrder > max) max = c.sortOrder;
      }
      return { _max: { sortOrder: max } };
    },
    findUnique: async ({
      where,
    }: {
      where: { id?: string; slug?: string; name?: string };
    }) => {
      if (where.id) return db.categories.get(where.id) ?? null;
      if (where.slug) {
        for (const c of db.categories.values())
          if (c.slug === where.slug) return c;
      }
      if (where.name) {
        for (const c of db.categories.values())
          if (c.name === where.name) return c;
      }
      return null;
    },
    create: async ({ data }: { data: Partial<Category> }) => {
      const id = data.id ?? makeId('cat');
      // Enforce unique name + slug
      for (const c of db.categories.values()) {
        if (c.name === data.name)
          throw Object.assign(new Error('Unique'), { code: 'P2002' });
        if (c.slug === data.slug)
          throw Object.assign(new Error('Unique'), { code: 'P2002' });
      }
      const now = new Date();
      const row: Category = {
        id,
        name: data.name!,
        slug: data.slug!,
        description: data.description ?? null,
        image: data.image ?? null,
        sortOrder: data.sortOrder ?? 0,
        isActive: data.isActive ?? true,
        createdAt: now,
        updatedAt: now,
      };
      db.categories.set(id, row);
      return row;
    },
    update: async ({
      where,
      data,
    }: {
      where: { id: string };
      data: Partial<Category>;
    }) => {
      const existing = db.categories.get(where.id);
      if (!existing) throw new Error('Not found');
      const updated = {
        ...existing,
        ...data,
        updatedAt: new Date(),
      } as Category;
      db.categories.set(where.id, updated);
      return updated;
    },
  };

  const product = {
    findMany: async ({
      where,
      include,
    }: {
      where?: { id?: { in?: string[] } };
      include?: { variants?: boolean; images?: boolean };
    } = {}) => {
      let rows = Array.from(db.products.values());
      if (where?.id?.in) {
        const set = new Set(where.id.in);
        rows = rows.filter((r) => set.has(r.id));
      }
      return rows.map((r) => ({
        ...r,
        ...(include?.variants ? { variants: r.variants } : {}),
        ...(include?.images ? { images: r.images } : {}),
      }));
    },
    findUnique: async ({
      where,
      include,
    }: {
      where: { id?: string; slug?: string };
      include?: { variants?: boolean; images?: boolean; category?: boolean };
    }) => {
      let row:
        | (typeof db.products extends Map<string, infer R> ? R : never)
        | null = null;
      if (where.id) row = db.products.get(where.id) ?? null;
      if (where.slug) {
        for (const p of db.products.values()) {
          if (p.slug === where.slug) {
            row = p;
            break;
          }
        }
      }
      if (!row) return null;
      return {
        ...row,
        ...(include?.variants ? { variants: row.variants } : {}),
        ...(include?.images ? { images: row.images } : {}),
        ...(include?.category
          ? { category: db.categories.get(row.categoryId) ?? null }
          : {}),
      };
    },
    create: async ({
      data,
    }: {
      data: Partial<Product> & {
        images?: { create?: Partial<ProductImage>[] };
        variants?: { create?: Partial<ProductVariant>[] };
      };
    }) => {
      // Enforce slug uniqueness (schema has @unique on slug + sku).
      for (const p of db.products.values()) {
        if (p.slug === data.slug)
          throw Object.assign(new Error('Unique'), { code: 'P2002' });
        if (data.sku && p.sku === data.sku)
          throw Object.assign(new Error('Unique'), { code: 'P2002' });
      }
      const id = data.id ?? makeId('prod');
      const now = new Date();
      const row = {
        id,
        name: data.name!,
        slug: data.slug!,
        description: data.description!,
        shortDescription: data.shortDescription ?? null,
        categoryId: data.categoryId!,
        basePrice: data.basePrice!,
        compareAtPrice: data.compareAtPrice ?? null,
        currency: data.currency ?? 'NGN',
        sku: data.sku ?? null,
        stockQuantity: data.stockQuantity ?? 0,
        isActive: data.isActive ?? true,
        isFeatured: data.isFeatured ?? false,
        tags: data.tags ?? [],
        metadata: data.metadata ?? null,
        createdAt: now,
        updatedAt: now,
        variants: [] as ProductVariant[],
        images: [] as ProductImage[],
      } as unknown as Product & {
        variants: ProductVariant[];
        images: ProductImage[];
      };
      // Handle nested create for images + variants (Prisma's standard
      // relational write shape).
      for (const img of data.images?.create ?? []) {
        const iid = img.id ?? makeId('img');
        const image: ProductImage = {
          id: iid,
          productId: id,
          url: img.url!,
          publicId: img.publicId!,
          alt: img.alt ?? null,
          width: img.width ?? null,
          height: img.height ?? null,
          sortOrder: img.sortOrder ?? 0,
          isPrimary: img.isPrimary ?? false,
        };
        row.images.push(image);
        db.productImages.set(iid, image);
      }
      for (const v of data.variants?.create ?? []) {
        const vid = v.id ?? makeId('var');
        const variant: ProductVariant = {
          id: vid,
          productId: id,
          name: v.name!,
          label: v.label!,
          price: v.price!,
          stockQuantity: v.stockQuantity ?? 0,
          sku: v.sku ?? null,
          isActive: v.isActive ?? true,
          metadata: v.metadata ?? null,
        };
        row.variants.push(variant);
        db.productVariants.set(vid, variant);
      }
      db.products.set(id, row);
      return row;
    },
    update: async ({
      where,
      data,
    }: {
      where: { id: string };
      data: Partial<Product> & {
        stockQuantity?: number | { increment?: number; decrement?: number };
      };
    }) => {
      const existing = db.products.get(where.id);
      if (!existing) throw new Error('Not found');
      // Translate Prisma's atomic-number operators into plain number
      // assignments so the rest of the update behaves normally.
      const patch: Partial<Product> = { ...(data as Partial<Product>) };
      if (
        data.stockQuantity &&
        typeof data.stockQuantity === 'object' &&
        !Array.isArray(data.stockQuantity)
      ) {
        const op = data.stockQuantity as {
          increment?: number;
          decrement?: number;
        };
        let next = existing.stockQuantity;
        if (op.increment !== undefined) next += op.increment;
        if (op.decrement !== undefined) next -= op.decrement;
        patch.stockQuantity = next;
      }
      const updated = { ...existing, ...patch, updatedAt: new Date() };
      db.products.set(where.id, updated as typeof existing);
      return updated;
    },
    updateMany: async ({
      where,
      data,
    }: {
      where: { id?: string; stockQuantity?: { gte?: number } };
      data: { stockQuantity?: { decrement?: number; increment?: number } };
    }) => {
      let count = 0;
      for (const p of db.products.values()) {
        if (where.id && p.id !== where.id) continue;
        if (
          where.stockQuantity?.gte !== undefined &&
          p.stockQuantity < where.stockQuantity.gte
        )
          continue;
        if (data.stockQuantity?.decrement !== undefined) {
          p.stockQuantity -= data.stockQuantity.decrement;
        }
        if (data.stockQuantity?.increment !== undefined) {
          p.stockQuantity += data.stockQuantity.increment;
        }
        count++;
      }
      return { count };
    },
    delete: async ({ where }: { where: { id: string } }) => {
      const row = db.products.get(where.id);
      if (!row) throw new Error('Not found');
      db.products.delete(where.id);
      return row;
    },
  };

  const productVariant = {
    findUnique: async ({ where }: { where: { id: string } }) =>
      db.productVariants.get(where.id) ?? null,
    findMany: async ({
      where,
      select,
    }: {
      where?: { productId?: string; id?: { in?: string[] } };
      select?: { id?: boolean };
    } = {}) => {
      const rows: ProductVariant[] = [];
      for (const v of db.productVariants.values()) {
        if (where?.productId && v.productId !== where.productId) continue;
        if (where?.id?.in && !where.id.in.includes(v.id)) continue;
        rows.push(v);
      }
      if (select) {
        return rows.map((r) => {
          const out: Record<string, unknown> = {};
          for (const [k, want] of Object.entries(select)) {
            if (want) out[k] = (r as unknown as Record<string, unknown>)[k];
          }
          return out;
        });
      }
      return rows;
    },
    create: async ({ data }: { data: Partial<ProductVariant> }) => {
      const id = data.id ?? makeId('var');
      const v: ProductVariant = {
        id,
        productId: data.productId!,
        name: data.name!,
        label: data.label!,
        price: data.price!,
        stockQuantity: data.stockQuantity ?? 0,
        sku: data.sku ?? null,
        isActive: data.isActive ?? true,
        metadata: data.metadata ?? null,
      };
      db.productVariants.set(id, v);
      const prod = db.products.get(v.productId);
      if (prod) prod.variants.push(v);
      return v;
    },
    createMany: async ({ data }: { data: Partial<ProductVariant>[] }) => {
      for (const d of data) {
        const vid = d.id ?? makeId('var');
        const v: ProductVariant = {
          id: vid,
          productId: d.productId!,
          name: d.name!,
          label: d.label!,
          price: d.price!,
          stockQuantity: d.stockQuantity ?? 0,
          sku: d.sku ?? null,
          isActive: d.isActive ?? true,
          metadata: d.metadata ?? null,
        };
        db.productVariants.set(vid, v);
        const prod = db.products.get(v.productId);
        if (prod) prod.variants.push(v);
      }
      return { count: data.length };
    },
    deleteMany: async ({
      where,
    }: {
      where: { productId?: string; id?: { in?: string[] } };
    }) => {
      let count = 0;
      for (const [id, v] of db.productVariants) {
        if (where.productId && v.productId !== where.productId) continue;
        if (where.id?.in && !where.id.in.includes(id)) continue;
        db.productVariants.delete(id);
        const prod = db.products.get(v.productId);
        if (prod) prod.variants = prod.variants.filter((x) => x.id !== id);
        count++;
      }
      return { count };
    },
    updateMany: async ({
      where,
      data,
    }: {
      where: {
        id?: string | { in?: string[] };
        productId?: string;
        stockQuantity?: { gte?: number };
      };
      data: {
        stockQuantity?: { decrement?: number; increment?: number };
        isActive?: boolean;
      };
    }) => {
      let count = 0;
      for (const v of db.productVariants.values()) {
        if (typeof where.id === 'string' && v.id !== where.id) continue;
        if (
          where.id &&
          typeof where.id === 'object' &&
          where.id.in &&
          !where.id.in.includes(v.id)
        )
          continue;
        if (where.productId && v.productId !== where.productId) continue;
        if (
          where.stockQuantity?.gte !== undefined &&
          v.stockQuantity < where.stockQuantity.gte
        )
          continue;
        if (data.stockQuantity?.decrement !== undefined) {
          v.stockQuantity -= data.stockQuantity.decrement;
        }
        if (data.stockQuantity?.increment !== undefined) {
          v.stockQuantity += data.stockQuantity.increment;
        }
        if (data.isActive !== undefined) {
          v.isActive = data.isActive;
        }
        count++;
      }
      return { count };
    },
    update: async ({
      where,
      data,
    }: {
      where: { id: string };
      data: { stockQuantity?: { increment?: number; decrement?: number } };
    }) => {
      const v = db.productVariants.get(where.id);
      if (!v) throw new Error('Not found');
      if (data.stockQuantity?.increment !== undefined)
        v.stockQuantity += data.stockQuantity.increment;
      if (data.stockQuantity?.decrement !== undefined)
        v.stockQuantity -= data.stockQuantity.decrement;
      return v;
    },
  };

  const order = {
    count: async ({
      where,
    }: { where?: { createdAt?: { gte?: Date } } } = {}) => {
      let n = 0;
      for (const o of db.orders.values()) {
        if (where?.createdAt?.gte && o.createdAt < where.createdAt.gte)
          continue;
        n++;
      }
      return n;
    },
    create: async ({
      data,
    }: {
      data: Partial<Order> & { items?: { create: Partial<OrderItem>[] } };
    }) => {
      // Unique orderNumber/accessToken enforcement
      for (const o of db.orders.values()) {
        if (o.orderNumber === data.orderNumber)
          throw Object.assign(new Error('Unique'), { code: 'P2002' });
        if (o.accessToken === data.accessToken)
          throw Object.assign(new Error('Unique'), { code: 'P2002' });
      }
      const id = data.id ?? makeId('ord');
      const now = new Date();
      const row = {
        id,
        orderNumber: data.orderNumber!,
        accessToken: data.accessToken!,
        status: data.status ?? ('PENDING' as OrderStatus),
        channel: data.channel!,
        userId: data.userId ?? null,
        customerName: data.customerName!,
        customerEmail: data.customerEmail ?? null,
        customerPhone: data.customerPhone!,
        shippingAddress: data.shippingAddress ?? null,
        shippingCity: data.shippingCity ?? null,
        shippingState: data.shippingState ?? null,
        subtotal: data.subtotal!,
        shippingCost:
          data.shippingCost ?? (0 as unknown as Order['shippingCost']),
        total: data.total!,
        currency: data.currency ?? 'NGN',
        paymentReference: data.paymentReference ?? null,
        paystackTransactionId: data.paystackTransactionId ?? null,
        paymentStatus: data.paymentStatus ?? null,
        notes: data.notes ?? null,
        adminNotes: data.adminNotes ?? null,
        accessTokenExpiresAt: data.accessTokenExpiresAt ?? null,
        abandonedAt: data.abandonedAt ?? null,
        // Prisma schema declares `stockReleased Boolean @default(true)`.
        // The default has to be applied here too — without it the
        // freshly-created Order has `stockReleased: undefined`, which
        // makes `!order.stockReleased` truthy and trips the
        // "shouldReclaimStock" branch in updateOrderStatus on the next
        // status transition (decrementing stock a second time).
        stockReleased: data.stockReleased ?? true,
        createdAt: now,
        updatedAt: now,
        items: [] as OrderItem[],
      } as unknown as Order & { items: OrderItem[] };
      for (const it of data.items?.create ?? []) {
        const item: OrderItem = {
          id: makeId('item'),
          orderId: id,
          productId: it.productId!,
          variantId: it.variantId ?? null,
          name: it.name!,
          variantName: it.variantName ?? null,
          price: it.price!,
          quantity: it.quantity!,
          total: it.total!,
        };
        row.items.push(item);
        db.orderItems.set(item.id, item);
      }
      db.orders.set(id, row);
      return row;
    },
    findUnique: async ({
      where,
      select,
      include,
    }: {
      where: {
        id?: string;
        orderNumber?: string;
        accessToken?: string;
        paymentReference?: string;
      };
      select?: Record<string, boolean | Record<string, unknown>>;
      include?: { items?: boolean };
    }) => {
      let row: (Order & { items: OrderItem[] }) | undefined;
      if (where.id) row = db.orders.get(where.id);
      else if (where.orderNumber) {
        for (const o of db.orders.values())
          if (o.orderNumber === where.orderNumber) row = o;
      } else if (where.accessToken) {
        for (const o of db.orders.values())
          if (o.accessToken === where.accessToken) row = o;
      } else if (where.paymentReference) {
        for (const o of db.orders.values())
          if (o.paymentReference === where.paymentReference) row = o;
      }
      if (!row) return null;
      if (select) {
        const out: Record<string, unknown> = {};
        for (const k of Object.keys(select)) {
          if (k === 'items' && select.items) out.items = row.items;
          else out[k] = (row as unknown as Record<string, unknown>)[k];
        }
        return out;
      }
      if (include?.items) return { ...row, items: row.items };
      return row;
    },
    update: async ({
      where,
      data,
    }: {
      where: { id: string };
      data: Partial<Order>;
    }) => {
      const existing = db.orders.get(where.id);
      if (!existing) throw new Error('Not found');
      const updated = { ...existing, ...data, updatedAt: new Date() };
      db.orders.set(where.id, updated as typeof existing);
      return updated;
    },
    updateMany: async ({
      where,
      data,
    }: {
      where: {
        id?: string;
        paymentReference?: string;
        status?: string | { in?: string[]; notIn?: string[]; not?: string };
      };
      data: Partial<Order>;
    }) => {
      let count = 0;
      for (const o of db.orders.values()) {
        if (where.id !== undefined && o.id !== where.id) continue;
        if (
          where.paymentReference !== undefined &&
          o.paymentReference !== where.paymentReference
        )
          continue;
        if (where.status !== undefined) {
          const s = where.status;
          if (typeof s === 'string') {
            if (o.status !== s) continue;
          } else {
            if (s.in && !s.in.includes(o.status)) continue;
            if (s.notIn && s.notIn.includes(o.status)) continue;
            if (s.not !== undefined && o.status === s.not) continue;
          }
        }
        Object.assign(o, data);
        count++;
      }
      return { count };
    },
    findMany: async () => Array.from(db.orders.values()),
  };

  const storeSettings = {
    findUnique: async ({ where }: { where: { id: string } }) =>
      db.storeSettings.get(where.id) ?? null,
    upsert: async ({
      where,
      create,
      update,
    }: {
      where: { id: string };
      create: Partial<StoreSettings>;
      update: Partial<StoreSettings>;
    }) => {
      const existing = db.storeSettings.get(where.id);
      if (existing) {
        const updated = { ...existing, ...update, updatedAt: new Date() };
        db.storeSettings.set(where.id, updated as StoreSettings);
        return updated;
      }
      const now = new Date();
      const row: StoreSettings = {
        id: where.id,
        storeName: create.storeName ?? 'Store',
        storeEmail: create.storeEmail ?? null,
        storePhone: create.storePhone ?? null,
        whatsappNumber: create.whatsappNumber ?? null,
        currency: create.currency ?? 'NGN',
        shippingFee:
          create.shippingFee ?? (0 as unknown as StoreSettings['shippingFee']),
        freeShippingMin: create.freeShippingMin ?? null,
        announcementBar: create.announcementBar ?? null,
        isMaintenanceMode: create.isMaintenanceMode ?? false,
        metadata: create.metadata ?? null,
        updatedAt: now,
      };
      db.storeSettings.set(where.id, row);
      return row;
    },
  };

  const emailSubscriber = {
    create: async ({ data }: { data: Partial<EmailSubscriber> }) => {
      for (const e of db.emailSubscribers.values()) {
        if (e.email === data.email)
          throw Object.assign(new Error('Unique'), { code: 'P2002' });
      }
      const row: EmailSubscriber = {
        id: makeId('sub'),
        email: data.email!,
        createdAt: data.createdAt ?? new Date(),
      };
      db.emailSubscribers.set(row.id, row);
      return row;
    },
    upsert: async ({
      where,
      create,
    }: {
      where: { email: string };
      update: Partial<EmailSubscriber>;
      create: Partial<EmailSubscriber>;
    }) => {
      for (const e of db.emailSubscribers.values()) {
        if (e.email === where.email) return e;
      }
      const row: EmailSubscriber = {
        id: makeId('sub'),
        email: create.email ?? where.email,
        createdAt: create.createdAt ?? new Date(),
      };
      db.emailSubscribers.set(row.id, row);
      return row;
    },
  };

  // $transaction: run the callback against the same mock and roll back
  // the parts of state that our server actions can mutate inside a tx.
  // Stock quantities are mutated in-place on shared object references
  // (product.stockQuantity and productVariant.stockQuantity), so we
  // snapshot the scalar values and write them back on error rather than
  // swapping Map references. Orders + order items are insert-only inside
  // a tx, so replacing the Maps with the pre-tx snapshot is sufficient.
  const $transaction = async <T>(
    fn: (tx: unknown) => Promise<T>,
  ): Promise<T> => {
    const stockSnap = new Map<string, number>();
    for (const [k, v] of db.products) stockSnap.set(`p:${k}`, v.stockQuantity);
    for (const [k, v] of db.productVariants)
      stockSnap.set(`v:${k}`, v.stockQuantity);
    const ordersSnap = new Map(db.orders);
    const orderItemsSnap = new Map(db.orderItems);
    const productImagesSnap = new Map(db.productImages);
    try {
      return await fn(prismaMock);
    } catch (err) {
      // Restore stock quantities in-place (keeps product.variants array
      // entries pointing at the same variant objects so the two views
      // stay consistent).
      for (const [k, v] of db.products) {
        const s = stockSnap.get(`p:${k}`);
        if (s !== undefined) v.stockQuantity = s;
      }
      for (const [k, v] of db.productVariants) {
        const s = stockSnap.get(`v:${k}`);
        if (s !== undefined) v.stockQuantity = s;
      }
      db.orders = ordersSnap;
      db.orderItems = orderItemsSnap;
      db.productImages = productImagesSnap;
      throw err;
    }
  };

  const prismaMock = {
    user,
    category,
    product,
    productVariant,
    productImage: {
      createMany: async ({ data }: { data: Partial<ProductImage>[] }) => {
        for (const d of data) {
          const img: ProductImage = {
            id: makeId('img'),
            productId: d.productId!,
            url: d.url!,
            publicId: d.publicId!,
            alt: d.alt ?? null,
            width: d.width ?? null,
            height: d.height ?? null,
            sortOrder: d.sortOrder ?? 0,
            isPrimary: d.isPrimary ?? false,
          };
          db.productImages.set(img.id, img);
          const prod = db.products.get(img.productId);
          if (prod) prod.images.push(img);
        }
        return { count: data.length };
      },
      deleteMany: async ({
        where,
      }: {
        where: { productId?: string; id?: { in?: string[] } };
      }) => {
        let count = 0;
        for (const [id, img] of db.productImages) {
          if (where.productId && img.productId !== where.productId) continue;
          if (where.id?.in && !where.id.in.includes(id)) continue;
          db.productImages.delete(id);
          // Also remove from any product.images array.
          const prod = db.products.get(img.productId);
          if (prod) {
            prod.images = prod.images.filter((i) => i.id !== id);
          }
          count++;
        }
        if (where.productId && !where.id) {
          const prod = db.products.get(where.productId);
          if (prod) prod.images = [];
        }
        return { count };
      },
      findMany: async ({
        where,
        select,
      }: {
        where?: { productId?: string };
        select?: { id?: boolean };
      } = {}) => {
        const rows: ProductImage[] = [];
        for (const img of db.productImages.values()) {
          if (where?.productId && img.productId !== where.productId) continue;
          rows.push(img);
        }
        if (select) {
          return rows.map((r) => {
            const out: Record<string, unknown> = {};
            for (const [k, want] of Object.entries(select)) {
              if (want) out[k] = (r as unknown as Record<string, unknown>)[k];
            }
            return out;
          });
        }
        return rows;
      },
      update: async ({
        where,
        data,
      }: {
        where: { id: string };
        data: Partial<ProductImage>;
      }) => {
        const img = db.productImages.get(where.id);
        if (!img) throw new Error('Not found');
        Object.assign(img, data);
        // Mirror into the product's images array (same object ref).
        return img;
      },
      create: async ({ data }: { data: Partial<ProductImage> }) => {
        const id = data.id ?? makeId('img');
        const img: ProductImage = {
          id,
          productId: data.productId!,
          url: data.url!,
          publicId: data.publicId!,
          alt: data.alt ?? null,
          width: data.width ?? null,
          height: data.height ?? null,
          sortOrder: data.sortOrder ?? 0,
          isPrimary: data.isPrimary ?? false,
        };
        db.productImages.set(id, img);
        const prod = db.products.get(img.productId);
        if (prod) prod.images.push(img);
        return img;
      },
    },
    order,
    storeSettings,
    emailSubscriber,
    processedWebhookEvent: {
      create: async ({
        data,
      }: {
        data: { paystackEventId: string; eventType: string };
      }) => {
        for (const row of db.processedWebhookEvents.values()) {
          if (row.paystackEventId === data.paystackEventId) {
            // The webhook handler narrows on
            // `instanceof Prisma.PrismaClientKnownRequestError` with
            // code P2002, so a plain Error wouldn't trigger the dedup
            // branch — it would fall through to "log and proceed",
            // which defeats the test. Construct the real class.
            throw new Prisma.PrismaClientKnownRequestError(
              'Unique constraint failed',
              { code: 'P2002', clientVersion: 'test' },
            );
          }
        }
        const row: ProcessedWebhookEventRow = {
          id: makeId('pwe'),
          paystackEventId: data.paystackEventId,
          eventType: data.eventType,
          processedAt: new Date(),
        };
        db.processedWebhookEvents.set(row.id, row);
        return row;
      },
    },
    $transaction,
  };

  return prismaMock;
}

/** Supabase auth fake with in-memory user store. */
export class FakeSupabaseAuth {
  users: Map<string, SupabaseUser> = new Map();
  /** Currently-signed-in user id (null if anonymous). */
  currentUserId: string | null = null;
  /** User id that has an active password-recovery session (PKCE flow). */
  recoveryUserId: string | null = null;
  /** Email confirmation required by default (matches Supabase default). */
  requireEmailConfirmation = true;
  /** Simulate stale/invalid refresh token (thrown by real Supabase). */
  simulateStaleToken = false;

  reset() {
    this.users.clear();
    this.currentUserId = null;
    this.recoveryUserId = null;
    this.simulateStaleToken = false;
    this.requireEmailConfirmation = true;
  }

  /** Directly seed a user (bypasses signup flow). */
  seedUser(email: string, password: string, opts: Partial<SupabaseUser> = {}) {
    const id = opts.id ?? crypto.randomUUID();
    const u: SupabaseUser = {
      id,
      email,
      password,
      emailConfirmed: opts.emailConfirmed ?? true,
      metadata: opts.metadata,
    };
    this.users.set(id, u);
    return u;
  }

  signUp = async ({
    email,
    password,
    options,
  }: {
    email: string;
    password: string;
    options?: { data?: Record<string, unknown>; emailRedirectTo?: string };
  }) => {
    for (const u of this.users.values()) {
      if (u.email === email) {
        return {
          data: { user: null, session: null },
          error: { message: 'User already registered' },
        };
      }
    }
    const id = crypto.randomUUID();
    const user: SupabaseUser = {
      id,
      email,
      password,
      emailConfirmed: !this.requireEmailConfirmation,
      metadata: options?.data,
    };
    this.users.set(id, user);
    // Matches real Supabase: when email confirmation is disabled the
    // signup call also establishes a session (the caller is now logged
    // in). When confirmation is required, `data.session` is null until
    // the user clicks the verification link.
    if (!this.requireEmailConfirmation) {
      this.currentUserId = id;
    }
    return {
      data: {
        user: { id, email, user_metadata: options?.data ?? {} },
        session: this.requireEmailConfirmation ? null : { user: { id, email } },
      },
      error: null,
    };
  };

  signInWithPassword = async ({
    email,
    password,
  }: {
    email: string;
    password: string;
  }) => {
    for (const u of this.users.values()) {
      if (u.email === email && u.password === password) {
        this.currentUserId = u.id;
        return {
          data: {
            user: { id: u.id, email: u.email },
            session: { user: { id: u.id, email: u.email } },
          },
          error: null,
        };
      }
    }
    return {
      data: { user: null, session: null },
      error: { message: 'Invalid login credentials' },
    };
  };

  signOut = async () => {
    this.currentUserId = null;
    return { error: null };
  };

  getUser = async () => {
    // Simulate stale refresh token error (thrown by real Supabase on invalid tokens).
    if (this.simulateStaleToken) {
      throw new Error('Invalid Refresh Token');
    }
    if (this.currentUserId) {
      const u = this.users.get(this.currentUserId);
      if (u)
        return { data: { user: { id: u.id, email: u.email } }, error: null };
    }
    if (this.recoveryUserId) {
      const u = this.users.get(this.recoveryUserId);
      if (u)
        return { data: { user: { id: u.id, email: u.email } }, error: null };
    }
    return { data: { user: null }, error: null };
  };

  resetPasswordForEmail = async (_email: string, _opts: unknown) => {
    // Find the user (if exists) and mark a recovery session.
    for (const u of this.users.values()) {
      if (u.email === _email) {
        this.recoveryUserId = u.id;
        break;
      }
    }
    return { data: {}, error: null };
  };

  updateUser = async (updates: { password?: string; email?: string }) => {
    const id = this.currentUserId ?? this.recoveryUserId;
    if (!id)
      return { data: { user: null }, error: { message: 'Not authenticated' } };
    const u = this.users.get(id);
    if (!u) return { data: { user: null }, error: { message: 'Not found' } };
    if (updates.password) u.password = updates.password;
    if (updates.email) u.email = updates.email;
    return { data: { user: { id: u.id, email: u.email } }, error: null };
  };

  resend = async (_args: {
    type: string;
    email: string;
    options?: unknown;
  }) => {
    return { data: {}, error: null };
  };
}

/** Next.js cookies()/headers() fake. */
export class FakeCookies {
  store: Map<string, { name: string; value: string; options?: unknown }> =
    new Map();

  reset() {
    this.store.clear();
  }

  get = (name: string) => this.store.get(name);
  getAll = () => Array.from(this.store.values());
  set = (name: string, value: string, options?: unknown) => {
    this.store.set(name, { name, value, options });
  };
  delete = (name: string) => {
    this.store.delete(name);
  };
}

export class FakeHeaders {
  headers: Map<string, string> = new Map([
    ['host', 'localhost:3000'],
    ['x-forwarded-proto', 'http'],
  ]);

  get = (name: string) => this.headers.get(name.toLowerCase()) ?? null;
}
