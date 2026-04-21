/**
 * Read mock data from the database.
 *
 * Usage:
 *   pnpm db:mock:read                    # summary of all mock rows
 *   pnpm db:mock:read -- --table products
 *   pnpm db:mock:read -- --table orders --limit 5
 *   pnpm db:mock:read -- --table subscribers
 *   pnpm db:mock:read -- --json          # raw JSON instead of pretty table
 */
import { prisma, MOCK, runScript } from './client';

type Table = 'all' | 'products' | 'orders' | 'subscribers' | 'categories';

interface Args {
  table: Table;
  limit: number;
  json: boolean;
}

function parseArgs(): Args {
  const argv = process.argv.slice(2);
  const args: Args = { table: 'all', limit: 10, json: false };
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i];
    if (key === '--json') args.json = true;
    if (key === '--table' && argv[i + 1]) args.table = argv[i + 1] as Table;
    if (key === '--limit' && argv[i + 1]) args.limit = Number(argv[i + 1]);
  }
  return args;
}

function fmt(n: number | string | null | undefined): string {
  if (n === null || n === undefined) return '—';
  const v = typeof n === 'string' ? Number(n) : n;
  return `₦${v.toLocaleString('en-NG')}`;
}

async function readProducts(limit: number, json: boolean): Promise<void> {
  const products = await prisma.product.findMany({
    where: { tags: { has: MOCK.productTag } },
    include: {
      category: true,
      _count: { select: { variants: true, images: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
  console.log(`\n📦 Mock products (${products.length})`);
  if (json) {
    console.log(JSON.stringify(products, null, 2));
    return;
  }
  for (const p of products) {
    console.log(
      `  ${p.sku?.padEnd(16)} │ ${p.name.slice(0, 40).padEnd(40)} │ ` +
        `${fmt(p.basePrice as unknown as number).padStart(12)} │ ` +
        `stock ${String(p.stockQuantity).padStart(3)} │ ` +
        `${p._count.variants} variants · ${p._count.images} imgs` +
        (p.isFeatured ? ' · ⭐' : ''),
    );
  }
}

async function readOrders(limit: number, json: boolean): Promise<void> {
  const orders = await prisma.order.findMany({
    where: { orderNumber: { startsWith: MOCK.orderPrefix } },
    include: { _count: { select: { items: true } } },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
  console.log(`\n🧾 Mock orders (${orders.length})`);
  if (json) {
    console.log(JSON.stringify(orders, null, 2));
    return;
  }
  for (const o of orders) {
    console.log(
      `  ${o.orderNumber.padEnd(28)} │ ${o.status.padEnd(10)} │ ` +
        `${o.channel.padEnd(9)} │ ${o.customerName.slice(0, 22).padEnd(22)} │ ` +
        `${fmt(o.total as unknown as number).padStart(12)} │ ${o._count.items} items`,
    );
  }
}

async function readSubscribers(limit: number, json: boolean): Promise<void> {
  const subs = await prisma.emailSubscriber.findMany({
    where: { email: { endsWith: MOCK.emailDomain } },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
  console.log(`\n📧 Mock email subscribers (${subs.length})`);
  if (json) {
    console.log(JSON.stringify(subs, null, 2));
    return;
  }
  for (const s of subs) {
    console.log(`  ${s.email.padEnd(60)} │ ${s.createdAt.toISOString()}`);
  }
}

async function readSummary(): Promise<void> {
  const [products, orders, subs] = await Promise.all([
    prisma.product.count({ where: { tags: { has: MOCK.productTag } } }),
    prisma.order.count({
      where: { orderNumber: { startsWith: MOCK.orderPrefix } },
    }),
    prisma.emailSubscriber.count({
      where: { email: { endsWith: MOCK.emailDomain } },
    }),
  ]);
  console.log('\n📊 Mock data summary');
  console.log(`   products:    ${products}`);
  console.log(`   orders:      ${orders}`);
  console.log(`   subscribers: ${subs}`);
}

async function main(): Promise<void> {
  const args = parseArgs();

  if (args.table === 'all') {
    await readSummary();
    await readProducts(args.limit, args.json);
    await readOrders(args.limit, args.json);
    await readSubscribers(args.limit, args.json);
  } else if (args.table === 'products') {
    await readProducts(args.limit, args.json);
  } else if (args.table === 'orders') {
    await readOrders(args.limit, args.json);
  } else if (args.table === 'subscribers') {
    await readSubscribers(args.limit, args.json);
  } else {
    console.error(`Unknown table: ${args.table}`);
    process.exit(1);
  }
  console.log();
}

runScript(main, 'read');
