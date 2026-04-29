import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth/require-user';
import { formatNaira, formatDateTime } from '@/lib/formatters';
import { logServerError } from '@/lib/log';
import { Badge } from '@/components/ui/Badge';

interface OrderDetailPageProps {
  params: Promise<{ id: string }>;
}

// Hand-written interfaces for ONLY the fields this page reads. We
// avoid importing types from `@prisma/client` here because Vercel's
// build typecheck has repeatedly rejected those imports for this
// specific file — first complaining about `Prisma.OrderGetPayload`,
// then about `Order` and `OrderItem` being "not exported", even
// though the generated client clearly exports them locally. Likely a
// pnpm symlink resolution quirk in Vercel's serverless build worker
// that we can't reproduce; the local `pnpm exec next build` is
// happy. Sidestepping the entire `@prisma/client` import on this
// page makes the build deterministic.
//
// `unknown` is used for Prisma Decimal columns because we coerce
// them via `Number(...)` at every use site — no need to drag the
// Decimal type in.
interface OrderItemRow {
  id: string;
  name: string;
  variantName: string | null;
  price: unknown; // Decimal — coerced via Number() at use site
  quantity: number;
  total: unknown;
}

interface OrderWithItems {
  id: string;
  orderNumber: string;
  status: string;
  channel: string;
  createdAt: Date;
  total: unknown;
  subtotal: unknown;
  shippingCost: unknown;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  shippingAddress: string | null;
  shippingCity: string | null;
  shippingState: string | null;
  items: OrderItemRow[];
}

export default async function OrderDetailPage({
  params,
}: OrderDetailPageProps) {
  const { id } = await params;
  const current = await requireUser();

  // IMPORTANT: the `userId` filter is what makes this page safe.
  // Without it, any authenticated customer could view any other
  // customer's order by guessing the order id.
  //
  // We intentionally DON'T wrap this in `safeFindOne` — that would
  // collapse a transient DB outage into the same "not found" path a
  // bogus id takes, and the customer would see a 404 for an order
  // that actually exists. Handle the two cases separately:
  //   - `null` return        → genuinely not this user's order → 404
  //   - thrown DB error      → let error.tsx show the retry UI
  let order: OrderWithItems | null;
  try {
    // Cast through `unknown` to our local interface. Prisma's actual
    // return type uses Decimal for money fields where our local
    // interface uses `unknown` (we coerce via `Number()` at the use
    // site anyway). Runtime shape is identical; only the static type
    // differs to keep this file independent of `@prisma/client`.
    const result = await prisma.order.findFirst({
      where: { id, userId: current.id },
      include: {
        items: {
          orderBy: { id: 'asc' },
        },
      },
    });
    order = result as unknown as OrderWithItems | null;
  } catch (error) {
    logServerError('accountOrderDetail', error);
    // Re-throw so Next.js renders the nearest error.tsx (retry UI)
    // rather than silently 404ing on a transient failure.
    throw error;
  }

  if (!order) notFound();

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/account/orders"
          className="text-silver hover:text-gold inline-flex items-center gap-1.5 text-sm font-medium"
        >
          <ArrowLeft className="h-4 w-4" /> Back to orders
        </Link>
      </div>

      <header className="border-slate/60 bg-charcoal/60 flex flex-wrap items-start justify-between gap-4 rounded-2xl border p-6">
        <div className="min-w-0 space-y-1">
          <p className="text-gold overline">Order</p>
          <h1 className="font-display text-ivory text-2xl font-semibold">
            {order.orderNumber}
          </h1>
          <p className="text-muted text-xs">
            Placed {formatDateTime(order.createdAt)} via{' '}
            {order.channel === 'WHATSAPP' ? 'WhatsApp' : 'Paystack'}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Badge variant="default">{order.status}</Badge>
          <span className="text-gold font-display text-xl font-semibold">
            {formatNaira(Number(order.total))}
          </span>
        </div>
      </header>

      <section className="border-slate/60 bg-charcoal/60 rounded-2xl border p-6">
        <h2 className="font-display text-ivory mb-4 text-base font-semibold">
          Items
        </h2>
        <ul className="border-slate/50 divide-slate/40 divide-y border-y">
          {order.items.map((item: OrderItemRow) => (
            <li
              key={item.id}
              className="flex items-center justify-between gap-4 py-3"
            >
              <div className="min-w-0">
                <p className="text-pearl text-sm">
                  {item.name}
                  {item.variantName ? (
                    <span className="text-muted"> ({item.variantName})</span>
                  ) : null}
                </p>
                <p className="text-muted text-xs">
                  {formatNaira(Number(item.price))} × {item.quantity}
                </p>
              </div>
              <p className="text-pearl text-sm font-medium">
                {formatNaira(Number(item.total))}
              </p>
            </li>
          ))}
        </ul>

        <dl className="mt-5 space-y-2 text-sm">
          <div className="text-silver flex justify-between">
            <dt>Subtotal</dt>
            <dd>{formatNaira(Number(order.subtotal))}</dd>
          </div>
          <div className="text-silver flex justify-between">
            <dt>Shipping</dt>
            <dd>{formatNaira(Number(order.shippingCost))}</dd>
          </div>
          <div className="border-slate/50 text-pearl flex justify-between border-t pt-3 font-semibold">
            <dt>Total</dt>
            <dd className="text-gold">{formatNaira(Number(order.total))}</dd>
          </div>
        </dl>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="border-slate/60 bg-charcoal/60 rounded-2xl border p-6">
          <h3 className="text-muted mb-3 overline">Contact</h3>
          <p className="text-pearl text-sm">{order.customerName}</p>
          <p className="text-silver text-sm">{order.customerPhone}</p>
          {order.customerEmail && (
            <p className="text-silver text-sm">{order.customerEmail}</p>
          )}
        </div>
        <div className="border-slate/60 bg-charcoal/60 rounded-2xl border p-6">
          <h3 className="text-muted mb-3 overline">Shipping to</h3>
          <p className="text-pearl text-sm leading-relaxed">
            {order.shippingAddress}
            <br />
            {order.shippingCity}, {order.shippingState}
          </p>
        </div>
      </section>
    </div>
  );
}
