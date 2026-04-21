'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { Textarea } from '@/components/ui/Textarea';
import { refundOrder } from '@/app/actions/orders';

interface RefundOrderFormProps {
  orderId: string;
  orderNumber: string;
  channel: string;
  status: string;
  paymentStatus: string | null;
}

/**
 * Admin refund form — only rendered for PAYSTACK orders that are in an
 * active status and aren't already being refunded. Submitting calls the
 * `refundOrder` server action, which hits Paystack's refund API and
 * flips `paymentStatus` to `refunding`. The order stays in its current
 * status until the `refund.processed` webhook fires, so this form
 * hides itself immediately on success.
 *
 * We show a confirmation dialog even for the first click — refunds are
 * irreversible (on both the Paystack side and the accounting side) and
 * a misclick here directly touches the customer's card.
 */
export function RefundOrderForm({
  orderId,
  orderNumber,
  channel,
  status,
  paymentStatus,
}: RefundOrderFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [reason, setReason] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Hide the form entirely when a refund isn't applicable. These are
  // all terminal-or-in-flight states where hitting Paystack again
  // would be an error.
  if (channel !== 'PAYSTACK') return null;
  if (status === 'PENDING' || status === 'CANCELLED' || status === 'REFUNDED') {
    return null;
  }
  if (paymentStatus === 'refunding') {
    return (
      <div className="border-slate bg-charcoal rounded-lg border p-6">
        <h2 className="font-display text-ivory mb-2 text-lg font-semibold">
          Refund in progress
        </h2>
        <p className="text-muted text-xs leading-relaxed">
          Paystack is processing the refund. The order will flip to
          REFUNDED automatically once Paystack confirms settlement.
        </p>
      </div>
    );
  }

  function runRefund() {
    startTransition(async () => {
      const result = await refundOrder(orderId, { reason });
      if (result.success) {
        toast(
          `Refund requested for ${orderNumber}. Awaiting Paystack confirmation.`,
          'success',
        );
        setConfirmOpen(false);
        setReason('');
        router.refresh();
      } else {
        toast(result.error, 'error');
        setConfirmOpen(false);
      }
    });
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isPending) return;
    if (reason.trim().length < 3) {
      toast('Please give a brief reason for the refund.', 'error');
      return;
    }
    setConfirmOpen(true);
  }

  return (
    <>
      <form
        onSubmit={handleSubmit}
        className="border-slate bg-charcoal rounded-lg border p-6"
      >
        <fieldset disabled={isPending} className="disabled:opacity-70">
          <h2 className="font-display text-ivory mb-3 text-lg font-semibold">
            Issue Refund
          </h2>
          <label
            htmlFor="refund-reason"
            className="text-silver mb-2 block text-xs font-medium"
          >
            Reason (visible in Paystack notes)
          </label>
          <Textarea
            id="refund-reason"
            name="reason"
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. customer-requested return, out-of-stock after checkout…"
            maxLength={300}
          />
          <p id="refund-hint" className="text-muted mt-2 mb-3 text-xs">
            Issues a full refund via Paystack. Stock is restored only
            after Paystack confirms settlement (webhook).
          </p>
          <Button
            type="submit"
            isLoading={isPending}
            size="sm"
            variant="destructive"
            className="w-full"
          >
            Refund via Paystack
          </Button>
        </fieldset>
      </form>
      <ConfirmDialog
        open={confirmOpen}
        onCancel={() => {
          if (!isPending) setConfirmOpen(false);
        }}
        onConfirm={runRefund}
        title={`Refund order ${orderNumber}?`}
        description="This will call Paystack's refund API for the full order amount. Once accepted, the refund cannot be cancelled — the customer's card will be credited. Stock is restored automatically after Paystack confirms."
        confirmLabel="Yes, issue refund"
        variant="destructive"
        isPending={isPending}
      />
    </>
  );
}
