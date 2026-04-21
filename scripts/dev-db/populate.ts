/**
 * Populate the database with mock data.
 *
 * Usage:
 *   pnpm db:mock:populate                       # default counts
 *   pnpm db:mock:populate -- --products 20 --orders 10 --subscribers 15
 *
 * Requires an existing Category row (run `pnpm db:seed` first if empty).
 * All mock records are tagged so `delete.ts` can remove them safely.
 */
import { randomBytes } from 'node:crypto';
import { prisma, MOCK, runScript } from './client';
import {
  generateMockProducts,
  generateMockOrders,
  generateMockSubscribers,
} from './mock-data';

interface Args {
  products: number;
  orders: number;
  subscribers: number;
}

function parseArgs(): Args {
  const argv = process.argv.slice(2);
  const defaults: Args = { products: 10, orders: 5, subscribers: 8 };
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i];
    const val = Number(argv[i + 1]);
    if (!key || Number.isNaN(val)) continue;
    if (key === '--products') defaults.products = val;
    if (key === '--orders') defaults.orders = val;
    if (key === '--subscribers') defaults.subscribers = val;
  }
  return defaults;
}

async function main(): Promise<void> {
  const args = parseArgs();
  console.log('\n🌱 Populating mock data');
  console.log(`   products:    ${args.products}`);
  console.log(`   orders:      ${args.orders}`);
  console.log(`   subscribers: ${args.subscribers}\n`);

  // ── 1. Resolve a category for mock products ────────────────────
  // Use an existing category if one exists; otherwise create a
  // generic "Mock Category" so the script works standalone without
  // requiring `db:demo:populate` or `db:seed` to run first.
  const category =
    (await prisma.category.findFirst({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    })) ??
    (await prisma.category.upsert({
      where: { slug: 'mock-category' },
      update: {},
      create: {
        name: 'Mock Category',
        slug: 'mock-category',
        description: 'Auto-created by db:mock:populate.',
        sortOrder: 99,
      },
    }));
  console.log(`   using category: ${category.name} (${category.id})`);

  // ── 2. Products ─────────────────────────────────────────────────
  const productInputs = generateMockProducts(args.products);
  let productsCreated = 0;
  for (const p of productInputs) {
    await prisma.product.create({
      data: {
        name: p.name,
        slug: p.slug,
        description: p.description,
        shortDescription: p.shortDescription,
        categoryId: category.id,
        basePrice: p.basePrice,
        compareAtPrice: p.compareAtPrice,
        sku: p.sku,
        stockQuantity: p.stockQuantity,
        isFeatured: p.isFeatured,
        tags: p.tags,
        images: { create: p.images },
        variants: { create: p.variants },
      },
    });
    productsCreated++;
  }
  console.log(`   ✓ created ${productsCreated} products`);

  // ── 3. Orders (referencing the mock products we just created) ─
  const mockProducts = await prisma.product.findMany({
    where: { tags: { has: MOCK.productTag } },
    include: { variants: true },
    take: 50,
  });

  const orderInputs = generateMockOrders(args.orders);
  let ordersCreated = 0;
  for (let i = 0; i < orderInputs.length; i++) {
    const o = orderInputs[i]!;
    // Pick 1-3 products per order
    const itemCount = 1 + (i % 3);
    const items = Array.from({ length: itemCount }, (_, k) => {
      const prod = mockProducts[(i + k) % mockProducts.length];
      if (!prod) return null;
      const variant = prod.variants[0];
      const price = Number(variant?.price ?? prod.basePrice);
      const quantity = 1 + (k % 2);
      return {
        productId: prod.id,
        variantId: variant?.id ?? null,
        name: prod.name,
        variantName: variant?.name ?? null,
        price,
        quantity,
        total: price * quantity,
      };
    }).filter((x): x is NonNullable<typeof x> => x !== null);

    if (items.length === 0) continue;

    const subtotal = items.reduce((s, it) => s + it.total, 0);
    const shippingCost = subtotal >= 100000 ? 0 : 3500;

    await prisma.order.create({
      data: {
        orderNumber: o.orderNumber,
        accessToken: randomBytes(32).toString('base64url'),
        status: 'PENDING',
        channel: o.channel,
        customerName: o.customerName,
        customerEmail: o.customerEmail,
        customerPhone: o.customerPhone,
        shippingAddress: o.shippingAddress,
        shippingCity: o.shippingCity,
        shippingState: o.shippingState,
        subtotal,
        shippingCost,
        total: subtotal + shippingCost,
        notes: o.notes,
        items: { create: items },
      },
    });
    ordersCreated++;
  }
  console.log(`   ✓ created ${ordersCreated} orders`);

  // ── 4. Email subscribers ────────────────────────────────────────
  const subInputs = generateMockSubscribers(args.subscribers);
  const subResult = await prisma.emailSubscriber.createMany({
    data: subInputs,
    skipDuplicates: true,
  });
  console.log(`   ✓ created ${subResult.count} email subscribers`);

  console.log('\n✅ Mock data populated.\n');
}

runScript(main, 'populate');
