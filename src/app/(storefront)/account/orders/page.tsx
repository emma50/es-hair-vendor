import type { Metadata } from 'next';
import Link from 'next/link';
import { Package, ArrowRight } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth/require-user';
import { safeList } from '@/lib/queries/safe';
import { formatNaira, formatDateTime } from '@/lib/formatters';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

export const metadata: Metadata = {
  title: 'Your Orders',
};

export default async function AccountOrdersPage() {
  const current = await requireUser();

  const orders = await safeList(
    () =>
      prisma.order.findMany({
        where: { userId: current.id },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          orderNumber: true,
          status: true,
          total: true,
          createdAt: true,
          items: {
            select: {
              id: true,
              name: true,
              variantName: true,
              quantity: true,
            },
          },
        },
      }),
    'accountOrdersList',
  );

  return (
    <div className="space-y-8">
      <header>
        <p className="text-gold mb-2 overline">Orders</p>
        <h1 className="font-display text-ivory text-3xl font-semibold">
          Your order history
        </h1>
        <p className="text-silver mt-2 text-sm">
          Track every order placed under this account.
        </p>
      </header>

      {orders.length === 0 ? (
        <div className="border-slate/60 bg-charcoal/60 flex flex-col items-center gap-4 rounded-2xl border p-12 text-center">
          <div className="bg-gold/10 rounded-full p-4">
            <Package className="text-gold h-7 w-7" />
          </div>
          <div>
            <h2 className="font-display text-ivory text-lg font-semibold">
              No orders yet
            </h2>
            <p className="text-silver mx-auto mt-2 max-w-sm text-sm">
              When you place your first order, it will appear here with its full
              history and status updates.
            </p>
          </div>
          <Link href="/products">
            <Button>Browse products</Button>
          </Link>
        </div>
      ) : (
        <ul className="space-y-4">
          {orders.map((order) => {
            const itemCount = order.items.reduce(
              (sum, it) => sum + it.quantity,
              0,
            );
            const preview = order.items
              .slice(0, 2)
              .map((it) =>
                it.variantName ? `${it.name} (${it.variantName})` : it.name,
              )
              .join(', ');
            const extra =
              order.items.length > 2 ? `, +${order.items.length - 2} more` : '';

            return (
              <li key={order.id}>
                <Link
                  href={`/account/orders/${order.id}`}
                  className="border-slate/60 bg-charcoal/60 hover:border-gold/40 group flex flex-col gap-3 rounded-2xl border p-5 transition-colors sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-3">
                      <span className="text-gold font-mono text-sm font-semibold">
                        {order.orderNumber}
                      </span>
                      <Badge variant="default">{order.status}</Badge>
                    </div>
                    <p className="text-silver text-sm">
                      {itemCount} item{itemCount === 1 ? '' : 's'} •{' '}
                      <span className="text-muted">
                        {preview}
                        {extra}
                      </span>
                    </p>
                    <p className="text-muted text-xs">
                      Placed {formatDateTime(order.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 sm:flex-col sm:items-end sm:gap-1">
                    <span className="text-pearl font-display text-lg font-semibold">
                      {formatNaira(Number(order.total))}
                    </span>
                    <span className="text-muted inline-flex items-center gap-1 text-xs">
                      View details
                      <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
