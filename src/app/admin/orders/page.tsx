import type { Metadata } from 'next';
import { Suspense } from 'react';
import Link from 'next/link';
import { formatNaira, formatDateTime } from '@/lib/formatters';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { ClipboardList } from 'lucide-react';
import {
  ORDER_STATUS_COLORS,
  ORDER_CHANNEL_COLORS,
  ITEMS_PER_PAGE,
} from '@/lib/constants';
import { getAdminOrders } from '@/lib/queries/products';
import { SearchInput } from '@/components/admin/SearchInput';
import { ORDER_STATUS_VALUES, isOrderStatus } from '@/lib/order-state';
import { SweepAbandonedButton } from './SweepAbandonedButton';

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: 'all', label: 'All' },
  ...ORDER_STATUS_VALUES.map((s) => ({
    value: s,
    label: s.charAt(0) + s.slice(1).toLowerCase(),
  })),
];

export const metadata: Metadata = {
  title: 'Orders | Admin',
};

function buildQuery(params: Record<string, string | number | undefined>) {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    parts.push(
      `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`,
    );
  }
  return parts.length > 0 ? `?${parts.join('&')}` : '';
}

interface AdminOrdersPageProps {
  searchParams: Promise<{
    page?: string;
    status?: string;
    search?: string;
  }>;
}

export default async function AdminOrdersPage({
  searchParams,
}: AdminOrdersPageProps) {
  const params = await searchParams;
  const pageParam = params.page ? parseInt(params.page, 10) : 1;
  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;
  // Drop unknown status values instead of letting Prisma throw at
  // runtime — protects against hand-edited URLs.
  const statusFilter = isOrderStatus(params.status) ? params.status : undefined;
  const search = params.search?.trim() || '';

  const { orders, totalPages } = await getAdminOrders({
    status: statusFilter,
    search: search || undefined,
    page,
    limit: ITEMS_PER_PAGE,
  });

  const isFiltered = Boolean(statusFilter) || Boolean(search);
  const activeFilter = statusFilter ?? 'all';

  return (
    <div>
      <h1 className="font-display text-ivory mb-6 text-2xl font-bold">
        Orders
      </h1>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-sm flex-1">
          <Suspense fallback={<Skeleton className="h-10 w-full rounded-md" />}>
            <SearchInput
              basePath="/admin/orders"
              placeholder="Search by order #, name, phone, or email…"
              ariaLabel="Search orders by number, customer name, phone or email"
            />
          </Suspense>
        </div>
        <div className="shrink-0">
          <SweepAbandonedButton />
        </div>
      </div>

      <div className="mb-4 overflow-x-auto">
        <div
          role="tablist"
          aria-label="Filter orders by status"
          className="border-slate bg-charcoal inline-flex min-w-min rounded-md border p-1 text-xs"
        >
          {STATUS_FILTERS.map((filter) => {
            const active = filter.value === activeFilter;
            const query = buildQuery({
              search: search || undefined,
              status: filter.value === 'all' ? undefined : filter.value,
            });
            return (
              <Link
                key={filter.value}
                role="tab"
                aria-selected={active}
                href={`/admin/orders${query}`}
                className={`rounded px-3 py-1.5 font-medium whitespace-nowrap transition-colors ${
                  active
                    ? 'bg-gold text-midnight'
                    : 'text-silver hover:text-pearl'
                }`}
              >
                {filter.label}
              </Link>
            );
          })}
        </div>
      </div>

      {orders.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title={isFiltered ? 'No orders match your filters' : 'No orders yet'}
          description={
            isFiltered
              ? search
                ? `We couldn't find any orders matching "${search}".`
                : `There are no orders with status "${statusFilter}". Try a different filter.`
              : 'Orders will appear here as customers place them through the storefront or WhatsApp.'
          }
          actionLabel={isFiltered ? 'Clear Filters' : undefined}
          actionHref={isFiltered ? '/admin/orders' : undefined}
        />
      ) : (
        <div className="border-slate overflow-x-auto rounded-lg border">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">
              Admin orders — number, date, customer, total, channel and status.
            </caption>
            <thead className="border-slate bg-graphite border-b">
              <tr>
                <th className="text-silver px-4 py-3 font-medium">Order #</th>
                <th className="text-silver px-4 py-3 font-medium">Date</th>
                <th className="text-silver px-4 py-3 font-medium">Customer</th>
                <th className="text-silver px-4 py-3 font-medium">Total</th>
                <th className="text-silver px-4 py-3 font-medium">Channel</th>
                <th className="text-silver px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-slate divide-y">
              {orders.map((order) => (
                <tr
                  key={order.id}
                  className="hover:bg-midnight transition-colors"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="text-gold hover:text-gold-light font-mono text-sm font-medium"
                    >
                      {order.orderNumber}
                    </Link>
                  </td>
                  <td className="text-silver px-4 py-3 text-sm">
                    {formatDateTime(order.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-pearl">{order.customerName}</p>
                    <p className="text-muted text-xs">{order.customerPhone}</p>
                  </td>
                  <td className="text-gold px-4 py-3 font-semibold">
                    {formatNaira(Number(order.total))}
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={ORDER_CHANNEL_COLORS[order.channel]}>
                      {order.channel}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={ORDER_STATUS_COLORS[order.status]}>
                      {order.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(totalPages ?? 0) > 1 && (
        <nav aria-label="Pagination" className="mt-4 flex justify-center gap-2">
          {Array.from({ length: totalPages! }, (_, i) => {
            const pageNum = i + 1;
            const query = buildQuery({
              page: pageNum,
              search: search || undefined,
              status: statusFilter,
            });
            const isCurrent = page === pageNum;
            return (
              <Link
                key={pageNum}
                href={`/admin/orders${query}`}
                aria-current={isCurrent ? 'page' : undefined}
                className={`rounded-md px-3 py-1.5 text-sm ${
                  isCurrent
                    ? 'bg-gold text-midnight'
                    : 'bg-charcoal text-silver hover:text-pearl'
                }`}
              >
                {pageNum}
              </Link>
            );
          })}
        </nav>
      )}
    </div>
  );
}
