import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { formatNaira, formatDateTime } from '@/lib/formatters';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/shared/ErrorState';
import { ORDER_STATUS_COLORS, ORDER_CHANNEL_COLORS } from '@/lib/constants';
import { buildWhatsAppCustomerMessageUrl } from '@/lib/whatsapp';
import { OrderStatusForm } from './OrderStatusForm';
import { OrderNotesForm } from './OrderNotesForm';
import { RefundOrderForm } from './RefundOrderForm';
import { PrintButton } from './PrintButton';
import { MessageCircle } from 'lucide-react';
import { logServerWarn } from '@/lib/log';

interface OrderDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: OrderDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  try {
    const order = await prisma.order.findUnique({
      where: { id },
      select: { orderNumber: true },
    });
    return {
      title: order
        ? `Order ${order.orderNumber} | Admin`
        : 'Order | Admin',
    };
  } catch {
    return { title: 'Order | Admin' };
  }
}

export default async function OrderDetailPage({
  params,
}: OrderDetailPageProps) {
  const { id } = await params;
  // Direct Prisma (no `safeFindOne`) so we can distinguish "not found"
  // (→ 404) from a transient DB error (→ retry UI). See the product
  // edit page for the same rationale.
  const orderSelect = {
    id: true,
    orderNumber: true,
    status: true,
    channel: true,
    customerName: true,
    customerEmail: true,
    customerPhone: true,
    shippingAddress: true,
    shippingCity: true,
    shippingState: true,
    subtotal: true,
    shippingCost: true,
    total: true,
    paymentReference: true,
    paymentStatus: true,
    notes: true,
    adminNotes: true,
    createdAt: true,
    items: {
      select: {
        id: true,
        name: true,
        variantName: true,
        price: true,
        quantity: true,
        total: true,
      },
    },
  } satisfies Prisma.OrderSelect;

  type OrderWithItems = Prisma.OrderGetPayload<{ select: typeof orderSelect }>;
  let order: OrderWithItems | null = null;
  let transientError = false;
  try {
    order = await prisma.order.findUnique({
      where: { id },
      select: orderSelect,
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    ) {
      notFound();
    }
    logServerWarn(
      'OrderDetailPage.load',
      error instanceof Error ? error.message : error,
    );
    transientError = true;
  }

  if (transientError) {
    return (
      <div>
        <h1 className="font-display text-ivory mb-6 text-2xl font-bold">
          Order
        </h1>
        <ErrorState
          title="Couldn't load this order"
          message="We hit a problem reaching the database. Refresh the page to try again, or return to the orders list."
          backHref="/admin/orders"
          backLabel="Back to Orders"
        />
      </div>
    );
  }

  if (!order) notFound();

  const whatsappUrl = buildWhatsAppCustomerMessageUrl(
    order.customerPhone,
    order.orderNumber,
  );

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <h1 className="text-gold font-mono text-2xl font-bold">
          {order.orderNumber}
        </h1>
        <Badge className={ORDER_STATUS_COLORS[order.status]}>
          {order.status}
        </Badge>
        <Badge className={ORDER_CHANNEL_COLORS[order.channel]}>
          {order.channel}
        </Badge>
        <PrintButton />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Order Info */}
        <div className="space-y-6 lg:col-span-2">
          {/* Items */}
          <div className="border-slate bg-charcoal rounded-lg border p-6">
            <h2 className="font-display text-ivory mb-4 text-lg font-semibold">
              Order Items
            </h2>
            <div className="space-y-3">
              {order.items.map((item) => (
                <div
                  key={item.id}
                  className="border-slate flex items-center justify-between border-b pb-3 last:border-0"
                >
                  <div>
                    <p className="text-pearl text-sm font-medium">
                      {item.name}
                    </p>
                    {item.variantName && (
                      <p className="text-muted text-xs">{item.variantName}</p>
                    )}
                    <p className="text-muted text-xs">
                      Qty: {item.quantity} × {formatNaira(Number(item.price))}
                    </p>
                  </div>
                  <p className="text-gold text-sm font-semibold">
                    {formatNaira(Number(item.total))}
                  </p>
                </div>
              ))}
            </div>
            <div className="border-slate mt-4 space-y-1 border-t pt-4 text-sm">
              <div className="text-silver flex justify-between">
                <span>Subtotal</span>
                <span>{formatNaira(Number(order.subtotal))}</span>
              </div>
              <div className="text-silver flex justify-between">
                <span>Shipping</span>
                <span>{formatNaira(Number(order.shippingCost))}</span>
              </div>
              <div className="flex justify-between text-base font-semibold">
                <span className="text-pearl">Total</span>
                <span className="text-gold">
                  {formatNaira(Number(order.total))}
                </span>
              </div>
            </div>
          </div>

          {/* Customer Info */}
          <div className="border-slate bg-charcoal rounded-lg border p-6">
            <h2 className="font-display text-ivory mb-4 text-lg font-semibold">
              Customer
            </h2>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted">Name</dt>
                <dd className="text-pearl">{order.customerName}</dd>
              </div>
              <div>
                <dt className="text-muted">Phone</dt>
                <dd className="text-pearl">{order.customerPhone}</dd>
              </div>
              {order.customerEmail && (
                <div>
                  <dt className="text-muted">Email</dt>
                  <dd className="text-pearl">{order.customerEmail}</dd>
                </div>
              )}
              {order.shippingAddress && (
                <div className="sm:col-span-2">
                  <dt className="text-muted">Address</dt>
                  <dd className="text-pearl">
                    {order.shippingAddress}, {order.shippingCity},{' '}
                    {order.shippingState}
                  </dd>
                </div>
              )}
              {order.notes && (
                <div className="sm:col-span-2">
                  <dt className="text-muted">Customer Notes</dt>
                  <dd className="text-pearl">{order.notes}</dd>
                </div>
              )}
            </dl>
            <div className="mt-4 print:hidden">
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="whatsapp" size="sm">
                  <MessageCircle className="h-4 w-4" /> Message Customer
                </Button>
              </a>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="print:hidden">
            <OrderStatusForm orderId={order.id} currentStatus={order.status} />
          </div>
          <div className="print:hidden">
            <RefundOrderForm
              orderId={order.id}
              orderNumber={order.orderNumber}
              channel={order.channel}
              status={order.status}
              paymentStatus={order.paymentStatus}
            />
          </div>
          <div className="print:hidden">
            <OrderNotesForm
              orderId={order.id}
              currentNotes={order.adminNotes || ''}
            />
          </div>

          {order.paymentReference && (
            <div className="border-slate bg-charcoal rounded-lg border p-6">
              <h2 className="font-display text-ivory mb-3 text-lg font-semibold">
                Payment
              </h2>
              <dl className="space-y-2 text-sm">
                <div>
                  <dt className="text-muted">Reference</dt>
                  <dd className="text-pearl font-mono">
                    {order.paymentReference}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted">Status</dt>
                  <dd className="text-pearl">
                    {order.paymentStatus || 'Pending'}
                  </dd>
                </div>
              </dl>
            </div>
          )}

          <p className="text-muted text-xs">
            Created {formatDateTime(order.createdAt)}
          </p>
        </div>
      </div>
    </div>
  );
}
