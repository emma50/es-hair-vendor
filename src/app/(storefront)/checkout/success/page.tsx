import { CheckCircle, Clock, MessageCircle } from 'lucide-react';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { safeFindOne } from '@/lib/queries/safe';
import { formatNaira, formatDateTime } from '@/lib/formatters';
import { buildWhatsAppDirectUrl } from '@/lib/whatsapp';
import { STORE_CONFIG } from '@/lib/constants';
import { Button } from '@/components/ui/Button';
import { reconcilePendingPaystackOrder } from '@/lib/orders/reconcile';
import { ClearCartOnMount } from './ClearCartOnMount';
import { PendingConfirmationPoller } from './PendingConfirmationPoller';

interface SuccessPageProps {
  searchParams: Promise<{ t?: string; channel?: string }>;
}

const orderSuccessSelect = {
  id: true,
  orderNumber: true,
  total: true,
  createdAt: true,
  status: true,
  paymentStatus: true,
  paymentReference: true,
  channel: true,
  items: {
    select: {
      id: true,
      name: true,
      variantName: true,
      quantity: true,
      total: true,
    },
  },
} as const;

/**
 * Name of the HTTP-only cookie that carries the most recent order's
 * access token. MUST stay in sync with `ORDER_TOKEN_COOKIE` in
 * `src/app/actions/orders.ts`.
 */
const ORDER_TOKEN_COOKIE = 'esh-order-token';

export default async function CheckoutSuccessPage({
  searchParams,
}: SuccessPageProps) {
  const params = await searchParams;
  const channel = params.channel;
  const isWhatsApp = channel === 'whatsapp';

  // The only accepted identifier is a capability token (`t` query param,
  // with fallback to the HTTP-only cookie set at order creation time).
  // We do NOT look up orders by `orderNumber` or `paymentReference`
  // anymore — those values are enumerable and would let an attacker
  // view any customer's order + PII by guessing.
  const cookieStore = await cookies();
  const token = params.t ?? cookieStore.get(ORDER_TOKEN_COOKIE)?.value;

  // No token — user navigated here directly.
  if (!token) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <CheckCircle className="text-muted mx-auto mb-6 h-16 w-16" />
        <h1 className="font-display text-ivory mb-2 text-2xl font-semibold">
          No order to display
        </h1>
        <p className="text-silver mb-8 text-sm leading-relaxed">
          It looks like you arrived here without placing an order. If you just
          completed a payment, your confirmation email will have your order
          details.
        </p>
        <Link href="/products">
          <Button>Browse Products</Button>
        </Link>
      </div>
    );
  }

  // Look up order by the capability token. We additionally require
  // the token to be unexpired — `accessTokenExpiresAt` is set 30 days
  // out at creation. Rows written before the expiry migration have
  // `null` expiry and are still accepted (backwards compat), but all
  // new orders bound the window in which a leaked `?t=` URL can
  // expose PII or line items.
  //
  // Wrapped in safeFindOne so a DB outage degrades to the "we couldn't
  // find your order" message instead of crashing the post-payment
  // success page.
  const now = new Date();
  const order = await safeFindOne(
    () =>
      prisma.order.findFirst({
        where: {
          accessToken: token,
          OR: [
            { accessTokenExpiresAt: null },
            { accessTokenExpiresAt: { gt: now } },
          ],
        },
        select: orderSuccessSelect,
      }),
    'checkoutSuccessOrder',
  );

  // Synchronously reconcile the order with Paystack so we never tell
  // the customer "Thank You!" while the order is silently PENDING
  // (waiting on an async webhook). If the verify call agrees on
  // amount+currency, the order flips to CONFIRMED right here; otherwise
  // we show a "being confirmed" state and leave the webhook to finish.
  const reconciled = order ? await reconcilePendingPaystackOrder(order) : null;
  const displayStatus = reconciled?.status ?? order?.status ?? null;
  const isPaystackPendingConfirmation =
    order?.channel === 'PAYSTACK' && displayStatus === 'PENDING';
  const isConfirmed = displayStatus === 'CONFIRMED';

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center">
      <ClearCartOnMount token={token} />

      {isWhatsApp ? (
        <MessageCircle className="text-whatsapp mx-auto mb-6 h-16 w-16" />
      ) : isPaystackPendingConfirmation ? (
        <Clock className="text-gold mx-auto mb-6 h-16 w-16" />
      ) : (
        <CheckCircle className="text-success mx-auto mb-6 h-16 w-16" />
      )}

      <h1 className="font-display text-ivory mb-2 text-3xl font-bold">
        {isWhatsApp
          ? 'Order Placed!'
          : isPaystackPendingConfirmation
            ? 'Finalising Your Payment…'
            : 'Thank You!'}
      </h1>
      <p className="text-silver mb-8">
        {isWhatsApp
          ? 'Your order has been placed. Please complete your conversation on WhatsApp to arrange payment.'
          : isPaystackPendingConfirmation
            ? 'Paystack is still confirming your payment. This usually takes a few seconds — we will update this page automatically.'
            : isConfirmed
              ? 'Your payment was received and your order is confirmed.'
              : 'Your order has been placed successfully.'}
      </p>

      {isPaystackPendingConfirmation && (
        <PendingConfirmationPoller token={token} />
      )}

      {isWhatsApp && (
        <div className="border-whatsapp/20 bg-whatsapp/5 mb-8 rounded-lg border p-4">
          <p className="text-silver text-sm leading-relaxed">
            A WhatsApp chat window should have opened with your order details.
            If it didn&apos;t, please contact us directly to confirm your order
            {order ? ` (${order.orderNumber})` : ''}.
          </p>
        </div>
      )}

      {!order && (
        <div className="border-slate bg-charcoal/50 mb-8 rounded-lg border p-4">
          <p className="text-silver text-sm leading-relaxed">
            We couldn&apos;t find your order details right now. Don&apos;t worry
            — your order has been placed. If you need help, please contact us
            with your payment reference.
          </p>
        </div>
      )}

      {order && (
        <div className="border-slate bg-charcoal mb-8 rounded-lg border p-6 text-left">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-muted text-sm">Order Number</span>
            <span className="text-gold font-mono text-lg font-bold">
              {order.orderNumber}
            </span>
          </div>
          <div className="mb-4 flex items-center justify-between">
            <span className="text-muted text-sm">Date</span>
            <span className="text-pearl text-sm">
              {formatDateTime(order.createdAt)}
            </span>
          </div>
          {isWhatsApp && (
            <div className="mb-4 flex items-center justify-between">
              <span className="text-muted text-sm">Payment</span>
              <span className="bg-whatsapp/20 text-whatsapp rounded-full px-2.5 py-0.5 text-xs font-medium">
                Pending — via WhatsApp
              </span>
            </div>
          )}
          <div className="border-slate border-t pt-4">
            {order.items.map((item) => (
              <div key={item.id} className="flex justify-between py-1 text-sm">
                <span className="text-silver">
                  {item.name}
                  {item.variantName ? ` (${item.variantName})` : ''} x
                  {item.quantity}
                </span>
                <span className="text-pearl">
                  {formatNaira(Number(item.total))}
                </span>
              </div>
            ))}
            <div className="border-slate mt-3 flex justify-between border-t pt-3 font-semibold">
              <span className="text-pearl">Total</span>
              <span className="text-gold">
                {formatNaira(Number(order.total))}
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
        <Link href="/products">
          <Button>Continue Shopping</Button>
        </Link>
        {isWhatsApp && (
          <a
            href={buildWhatsAppDirectUrl(STORE_CONFIG.whatsappNumber)}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="whatsapp">
              <MessageCircle className="mr-2 h-4 w-4" />
              Open WhatsApp
            </Button>
          </a>
        )}
      </div>
    </div>
  );
}
