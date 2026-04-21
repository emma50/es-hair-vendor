import Link from 'next/link';
import { Package, ShoppingBag, User, ArrowRight } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth/require-user';
import { safeList } from '@/lib/queries/safe';
import { formatNaira, formatDateTime } from '@/lib/formatters';
import { Badge } from '@/components/ui/Badge';

export default async function AccountOverviewPage() {
  const current = await requireUser();

  const [recentOrders, orderStats] = await Promise.all([
    safeList(
      () =>
        prisma.order.findMany({
          where: { userId: current.id },
          orderBy: { createdAt: 'desc' },
          take: 3,
          select: {
            id: true,
            orderNumber: true,
            status: true,
            total: true,
            createdAt: true,
          },
        }),
      'accountOverviewRecentOrders',
    ),
    prisma.order
      .aggregate({
        where: { userId: current.id },
        _count: { _all: true },
        _sum: { total: true },
      })
      .catch(() => ({
        _count: { _all: 0 },
        _sum: { total: null as unknown as null },
      })),
  ]);

  const displayName = current.appUser.name ?? current.email.split('@')[0];

  return (
    <div className="space-y-8">
      <header>
        <p className="text-gold mb-2 overline">Your dashboard</p>
        <h1 className="font-display text-ivory text-3xl font-semibold">
          Welcome back, {displayName}.
        </h1>
        <p className="text-silver mt-2 text-sm">
          Here&apos;s a quick look at your recent activity.
        </p>
      </header>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard
          label="Total orders"
          value={String(orderStats._count._all ?? 0)}
          icon={<ShoppingBag className="text-gold h-5 w-5" />}
        />
        <StatCard
          label="Lifetime spend"
          value={formatNaira(Number(orderStats._sum.total ?? 0))}
          icon={<Package className="text-gold h-5 w-5" />}
        />
      </div>

      {/* Recent orders */}
      <section>
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="font-display text-ivory text-lg font-semibold">
            Recent orders
          </h2>
          {recentOrders.length > 0 && (
            <Link
              href="/account/orders"
              className="text-gold hover:text-gold-light inline-flex items-center gap-1 text-xs font-medium underline-offset-4 hover:underline"
            >
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          )}
        </div>

        {recentOrders.length === 0 ? (
          <EmptyState />
        ) : (
          <ul className="space-y-3">
            {recentOrders.map((order) => (
              <li key={order.id}>
                <Link
                  href={`/account/orders/${order.id}`}
                  className="border-slate/60 bg-charcoal/60 hover:border-gold/40 group flex items-center justify-between gap-4 rounded-xl border p-4 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-gold font-mono text-sm font-semibold">
                      {order.orderNumber}
                    </p>
                    <p className="text-muted mt-0.5 text-xs">
                      {formatDateTime(order.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="default">{order.status}</Badge>
                    <span className="text-pearl text-sm font-medium">
                      {formatNaira(Number(order.total))}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="font-display text-ivory mb-4 text-lg font-semibold">
          Quick actions
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <QuickAction
            href="/account/profile"
            icon={<User className="text-gold h-4 w-4" />}
            title="Edit profile"
            desc="Update your name, email, or password."
          />
          <QuickAction
            href="/products"
            icon={<ShoppingBag className="text-gold h-4 w-4" />}
            title="Continue shopping"
            desc="Browse the latest arrivals and bestsellers."
          />
        </div>
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="border-slate/60 bg-charcoal/60 rounded-xl border p-5 backdrop-blur-sm">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-muted overline">{label}</p>
        {icon}
      </div>
      <p className="font-display text-ivory text-2xl font-semibold">{value}</p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="border-slate/60 bg-charcoal/60 rounded-xl border p-8 text-center">
      <Package className="text-muted mx-auto mb-3 h-8 w-8" />
      <p className="text-silver text-sm">No orders yet.</p>
      <Link
        href="/products"
        className="text-gold hover:text-gold-light mt-3 inline-block text-xs font-medium underline-offset-4 hover:underline"
      >
        Explore the collection →
      </Link>
    </div>
  );
}

function QuickAction({
  href,
  icon,
  title,
  desc,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <Link
      href={href}
      className="border-slate/60 bg-charcoal/60 hover:border-gold/40 group flex items-start gap-3 rounded-xl border p-4 transition-colors"
    >
      <div className="bg-gold/10 rounded-lg p-2">{icon}</div>
      <div>
        <p className="text-pearl text-sm font-semibold">{title}</p>
        <p className="text-muted mt-0.5 text-xs leading-relaxed">{desc}</p>
      </div>
    </Link>
  );
}
