/**
 * Update mock data in the database.
 *
 * Usage:
 *   pnpm db:mock:update                              # cycle order statuses
 *   pnpm db:mock:update -- --action restock          # refill product stock
 *   pnpm db:mock:update -- --action discount         # apply 20% discount
 *   pnpm db:mock:update -- --action cycle-status     # advance order statuses
 *   pnpm db:mock:update -- --action toggle-featured  # flip isFeatured
 *
 * Only touches rows tagged as mock data, never real records.
 */
import { prisma, MOCK, runScript } from './client';
import type { OrderStatus } from '@prisma/client';

type Action = 'cycle-status' | 'restock' | 'discount' | 'toggle-featured';

function parseArgs(): { action: Action } {
  const argv = process.argv.slice(2);
  let action: Action = 'cycle-status';
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--action' && argv[i + 1]) action = argv[i + 1] as Action;
  }
  return { action };
}

/** PENDING → CONFIRMED → PROCESSING → SHIPPED → DELIVERED → PENDING */
const STATUS_CYCLE: Record<OrderStatus, OrderStatus> = {
  PENDING: 'CONFIRMED',
  CONFIRMED: 'PROCESSING',
  PROCESSING: 'SHIPPED',
  SHIPPED: 'DELIVERED',
  DELIVERED: 'PENDING',
  CANCELLED: 'PENDING',
  REFUNDED: 'PENDING',
  DISPUTED: 'PENDING',
};

async function cycleStatus(): Promise<void> {
  const orders = await prisma.order.findMany({
    where: { orderNumber: { startsWith: MOCK.orderPrefix } },
    select: { id: true, status: true, orderNumber: true },
  });
  console.log(`\n🔄 Cycling status for ${orders.length} mock orders`);
  for (const o of orders) {
    const next = STATUS_CYCLE[o.status];
    await prisma.order.update({
      where: { id: o.id },
      data: { status: next },
    });
    console.log(`   ${o.orderNumber}: ${o.status} → ${next}`);
  }
}

async function restock(): Promise<void> {
  const result = await prisma.product.updateMany({
    where: { tags: { has: MOCK.productTag } },
    data: { stockQuantity: 25 },
  });
  console.log(`\n📦 Restocked ${result.count} mock products to 25 units`);

  const variantResult = await prisma.productVariant.updateMany({
    where: { product: { tags: { has: MOCK.productTag } } },
    data: { stockQuantity: 10 },
  });
  console.log(`   also restocked ${variantResult.count} variants to 10 units`);
}

async function applyDiscount(): Promise<void> {
  const products = await prisma.product.findMany({
    where: { tags: { has: MOCK.productTag } },
    select: { id: true, name: true, basePrice: true },
  });
  console.log(
    `\n💸 Applying 20% compareAtPrice to ${products.length} mock products`,
  );
  for (const p of products) {
    const base = Number(p.basePrice);
    // Mark current price as the discounted price; compareAt = base * 1.25
    const compareAt = Math.round(base * 1.25);
    await prisma.product.update({
      where: { id: p.id },
      data: { compareAtPrice: compareAt },
    });
  }
  console.log(`   ✓ updated compareAtPrice on all mock products`);
}

async function toggleFeatured(): Promise<void> {
  const products = await prisma.product.findMany({
    where: { tags: { has: MOCK.productTag } },
    select: { id: true, isFeatured: true },
  });
  console.log(`\n⭐ Toggling isFeatured on ${products.length} mock products`);
  for (const p of products) {
    await prisma.product.update({
      where: { id: p.id },
      data: { isFeatured: !p.isFeatured },
    });
  }
  console.log(`   ✓ done`);
}

async function main(): Promise<void> {
  const { action } = parseArgs();
  switch (action) {
    case 'cycle-status':
      await cycleStatus();
      break;
    case 'restock':
      await restock();
      break;
    case 'discount':
      await applyDiscount();
      break;
    case 'toggle-featured':
      await toggleFeatured();
      break;
    default:
      console.error(`Unknown action: ${action}`);
      process.exit(1);
  }
  console.log('\n✅ update done\n');
}

runScript(main, 'update');
