/**
 * Delete mock data from the database.
 *
 * Usage:
 *   pnpm db:mock:delete                    # delete ALL mock rows (confirm prompt)
 *   pnpm db:mock:delete -- --table products
 *   pnpm db:mock:delete -- --table orders
 *   pnpm db:mock:delete -- --table subscribers
 *   pnpm db:mock:delete -- --yes           # skip confirm (for CI / reset script)
 *
 * SAFETY: only deletes rows that match the mock tagging convention:
 *   - Products with "mock" in tags[]
 *   - Orders with orderNumber starting with "MOCK-"
 *   - EmailSubscribers whose email ends with "@mock.eshair.dev"
 */
import { createInterface } from 'readline/promises';
import { stdin, stdout } from 'process';
import { prisma, MOCK, runScript } from './client';

type Table = 'all' | 'products' | 'orders' | 'subscribers';

interface Args {
  table: Table;
  yes: boolean;
}

function parseArgs(): Args {
  const argv = process.argv.slice(2);
  const args: Args = { table: 'all', yes: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--yes' || argv[i] === '-y') args.yes = true;
    if (argv[i] === '--table' && argv[i + 1]) args.table = argv[i + 1] as Table;
  }
  return args;
}

async function confirm(prompt: string): Promise<boolean> {
  const rl = createInterface({ input: stdin, output: stdout });
  const answer = await rl.question(`${prompt} (y/N) `);
  rl.close();
  return answer.trim().toLowerCase() === 'y';
}

async function deleteProducts(): Promise<number> {
  // Cascade: ProductImage + ProductVariant cascade on delete.
  // OrderItem has no cascade on Product, so we need to purge mock orders FIRST
  // (or at least their items referencing mock products). deleteOrders() handles
  // orders with MOCK- prefix. Any non-mock order referencing a mock product
  // will block the delete and surface the problem loudly.
  const result = await prisma.product.deleteMany({
    where: { tags: { has: MOCK.productTag } },
  });
  return result.count;
}

async function deleteOrders(): Promise<number> {
  // OrderItem cascades on Order delete.
  const result = await prisma.order.deleteMany({
    where: { orderNumber: { startsWith: MOCK.orderPrefix } },
  });
  return result.count;
}

async function deleteSubscribers(): Promise<number> {
  const result = await prisma.emailSubscriber.deleteMany({
    where: { email: { endsWith: MOCK.emailDomain } },
  });
  return result.count;
}

async function main(): Promise<void> {
  const args = parseArgs();

  // Show what would be deleted before asking
  const [productCount, orderCount, subCount] = await Promise.all([
    prisma.product.count({ where: { tags: { has: MOCK.productTag } } }),
    prisma.order.count({
      where: { orderNumber: { startsWith: MOCK.orderPrefix } },
    }),
    prisma.emailSubscriber.count({
      where: { email: { endsWith: MOCK.emailDomain } },
    }),
  ]);

  console.log('\n🗑  Mock data delete plan');
  if (args.table === 'all' || args.table === 'orders') {
    console.log(`   orders:      ${orderCount}`);
  }
  if (args.table === 'all' || args.table === 'products') {
    console.log(`   products:    ${productCount}`);
  }
  if (args.table === 'all' || args.table === 'subscribers') {
    console.log(`   subscribers: ${subCount}`);
  }

  if (productCount + orderCount + subCount === 0) {
    console.log('\n   nothing to delete.\n');
    return;
  }

  if (!args.yes) {
    const ok = await confirm('\nProceed with delete?');
    if (!ok) {
      console.log('   cancelled.\n');
      return;
    }
  }

  // Order matters: orders before products (OrderItem → Product FK)
  if (args.table === 'all' || args.table === 'orders') {
    const n = await deleteOrders();
    console.log(`   ✓ deleted ${n} orders`);
  }
  if (args.table === 'all' || args.table === 'products') {
    const n = await deleteProducts();
    console.log(`   ✓ deleted ${n} products`);
  }
  if (args.table === 'all' || args.table === 'subscribers') {
    const n = await deleteSubscribers();
    console.log(`   ✓ deleted ${n} subscribers`);
  }

  console.log('\n✅ mock data deleted.\n');
}

runScript(main, 'delete');
