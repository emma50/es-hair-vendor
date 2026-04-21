import type { Metadata } from 'next';
import { formatNaira } from '@/lib/formatters';
import { Badge } from '@/components/ui/Badge';
import { ORDER_STATUS_COLORS } from '@/lib/constants';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Plus, ArrowRight } from 'lucide-react';
import { getDashboardData } from '@/lib/queries/products';

export const metadata: Metadata = {
  title: 'Dashboard | Admin',
};

export default async function AdminDashboard() {
  const { revenue, recentOrders, lowStockProducts } = await getDashboardData();

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <h1 className="font-display text-ivory text-2xl font-bold">
          Dashboard
        </h1>
        <Link href="/admin/products/new">
          <Button size="sm">
            <Plus className="h-4 w-4" /> Add Product
          </Button>
        </Link>
      </div>

      {/* Revenue Cards */}
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        {[
          { label: 'Today', value: revenue.today },
          { label: 'This Week', value: revenue.week },
          { label: 'This Month', value: revenue.month },
        ].map((card) => (
          <div
            key={card.label}
            className="border-slate bg-charcoal rounded-lg border p-6"
          >
            <p className="text-muted text-sm">{card.label}</p>
            <p className="text-gold mt-1 text-2xl font-bold">
              {formatNaira(card.value)}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Recent Orders */}
        <div className="border-slate bg-charcoal rounded-lg border p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-ivory text-lg font-semibold">
              Recent Orders
            </h2>
            <Link
              href="/admin/orders"
              className="text-gold hover:text-gold-light text-sm"
            >
              View All <ArrowRight className="ml-1 inline h-3 w-3" />
            </Link>
          </div>
          {recentOrders.length === 0 ? (
            <p className="text-muted text-sm">No orders yet.</p>
          ) : (
            <div className="space-y-3">
              {recentOrders.map((order) => (
                <Link
                  key={order.id}
                  href={`/admin/orders/${order.id}`}
                  className="hover:bg-midnight flex items-center justify-between rounded-md p-2 transition-colors"
                >
                  <div>
                    <p className="text-pearl font-mono text-sm font-medium">
                      {order.orderNumber}
                    </p>
                    <p className="text-muted text-xs">{order.customerName}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-gold text-sm font-semibold">
                      {formatNaira(Number(order.total))}
                    </p>
                    <Badge className={ORDER_STATUS_COLORS[order.status]}>
                      {order.status}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Low Stock Alerts */}
        <div className="border-slate bg-charcoal rounded-lg border p-6">
          <h2 className="font-display text-ivory mb-4 text-lg font-semibold">
            Low Stock Alerts
          </h2>
          {lowStockProducts.length === 0 ? (
            <p className="text-muted text-sm">All products are well stocked.</p>
          ) : (
            <div className="space-y-3">
              {lowStockProducts.map((product) => (
                <Link
                  key={product.id}
                  href={`/admin/products/${product.id}`}
                  className="hover:bg-midnight flex items-center justify-between rounded-md p-2 transition-colors"
                >
                  <p className="text-pearl text-sm">{product.name}</p>
                  <Badge
                    variant={product.stockQuantity <= 0 ? 'error' : 'warning'}
                  >
                    {product.stockQuantity} left
                  </Badge>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
