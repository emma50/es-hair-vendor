'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { updateOrderStatus } from '@/app/actions/orders';
import { ORDER_STATUS_LABELS } from '@/lib/constants';
import {
  ORDER_STATUS_VALUES,
  allowedNextStatuses,
  type OrderStatus,
} from '@/lib/order-state';

interface OrderStatusFormProps {
  orderId: string;
  currentStatus: string;
}

/**
 * Statuses that cause a visible, hard-to-reverse effect on the business
 * (stock release, customer communication tone). We require an explicit
 * browser confirmation before submitting to prevent misclick-driven
 * cancellations.
 */
const DESTRUCTIVE_STATUSES: ReadonlySet<OrderStatus> = new Set([
  'CANCELLED',
  'REFUNDED',
]);

export function OrderStatusForm({
  orderId,
  currentStatus,
}: OrderStatusFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [selected, setSelected] = useState<OrderStatus>(
    currentStatus as OrderStatus,
  );
  // `true` while the destructive-transition confirmation is up. The
  // dialog stays open while the server action runs so the admin sees
  // the loading state on the confirm button itself.
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Derive the list of statuses the admin may transition TO from the
  // current status via the server-side state machine — we reuse the
  // same module both places so UI + action stay in lockstep.
  const selectable = useMemo(() => {
    const allowed = new Set(allowedNextStatuses(currentStatus as OrderStatus));
    // If an order somehow ends up in a status we no longer recognise,
    // fall back to showing every status so the admin isn't stuck.
    return ORDER_STATUS_VALUES.filter((s) => allowed.has(s));
  }, [currentStatus]);

  const isTerminal = selectable.length <= 1; // only self-transition available
  const unchanged = selected === currentStatus;

  function runUpdate() {
    startTransition(async () => {
      const result = await updateOrderStatus(orderId, { status: selected });
      if (result.success) {
        toast('Order status updated!', 'success');
        setConfirmOpen(false);
        router.refresh();
      } else {
        toast(result.error, 'error');
        setConfirmOpen(false);
      }
    });
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isPending || unchanged) return;

    // Destructive transitions (CANCELLED/REFUNDED) prompt for explicit
    // confirmation — everything else commits immediately.
    if (DESTRUCTIVE_STATUSES.has(selected)) {
      setConfirmOpen(true);
      return;
    }

    runUpdate();
  }

  const destructiveLabel = ORDER_STATUS_LABELS[selected] ?? selected;
  const destructiveDescription =
    selected === 'CANCELLED'
      ? 'Stock for all items will be credited back to inventory. The customer can still view this order.'
      : // REFUNDED via the status dropdown does NOT call Paystack — it
        // only records the state locally. For PAYSTACK orders, use the
        // dedicated "Refund via Paystack" form so the customer's card
        // is actually credited. This path is for WhatsApp / offline
        // refunds and for after-the-fact status correction.
        'Closes the order as refunded locally and credits stock back. This does NOT call Paystack — use the "Refund via Paystack" form for card refunds.';

  return (
    <>
      <form
        onSubmit={handleSubmit}
        className="border-slate bg-charcoal rounded-lg border p-6"
      >
        <fieldset disabled={isPending} className="disabled:opacity-70">
          <h2 className="font-display text-ivory mb-3 text-lg font-semibold">
            Update Status
          </h2>
          <label htmlFor="order-status" className="sr-only">
            Order status
          </label>
          <select
            id="order-status"
            name="status"
            value={selected}
            onChange={(e) => setSelected(e.target.value as OrderStatus)}
            disabled={isPending || isTerminal}
            aria-describedby="order-status-hint"
            className="border-slate bg-graphite text-pearl focus:border-gold mb-3 h-10 w-full rounded-md border px-3 text-sm focus:outline-none disabled:opacity-60"
          >
            {selectable.map((s) => (
              <option key={s} value={s}>
                {ORDER_STATUS_LABELS[s] ?? s}
              </option>
            ))}
          </select>
          <p id="order-status-hint" className="text-muted mb-3 text-xs">
            {isTerminal
              ? 'This order is in a terminal state and cannot change.'
              : 'Only transitions valid for the current status are shown.'}
          </p>
          <Button
            type="submit"
            isLoading={isPending}
            disabled={unchanged || isTerminal}
            size="sm"
            className="w-full"
          >
            Update Status
          </Button>
        </fieldset>
      </form>
      <ConfirmDialog
        open={confirmOpen}
        onCancel={() => {
          if (!isPending) setConfirmOpen(false);
        }}
        onConfirm={runUpdate}
        title={`Mark this order as ${destructiveLabel}?`}
        description={destructiveDescription}
        confirmLabel={`Mark ${destructiveLabel}`}
        variant="destructive"
        isPending={isPending}
      />
    </>
  );
}
