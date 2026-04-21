'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { adminSweepAbandonedOrders } from '@/app/actions/orders';

/**
 * Admin-side trigger for the abandoned-PENDING sweep. The cron path
 * runs automatically on a schedule (see
 * `/api/internal/release-abandoned-orders`); this button is for the
 * "I need stock back NOW" case where the admin has spotted leaked
 * inventory and doesn't want to wait for the next cron tick.
 *
 * Confirmation dialog is deliberate — re-verifying every PENDING row
 * with Paystack's REST API is a small-but-real cost, and we don't
 * want a misclick to blast them on every admin keystroke.
 */
export function SweepAbandonedButton() {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);

  function runSweep() {
    startTransition(async () => {
      const result = await adminSweepAbandonedOrders(30);
      setConfirmOpen(false);
      if (!result.success) {
        toast(result.error, 'error');
        return;
      }
      const { considered, promoted, cancelled, errored } = result.data;
      if (considered === 0) {
        toast('No abandoned orders to release.', 'info');
      } else {
        toast(
          `Swept ${considered} order(s): ${cancelled} cancelled, ${promoted} promoted${errored > 0 ? `, ${errored} errored` : ''}.`,
          'success',
        );
      }
      router.refresh();
    });
  }

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="secondary"
        isLoading={isPending}
        onClick={() => setConfirmOpen(true)}
      >
        Release abandoned
      </Button>
      <ConfirmDialog
        open={confirmOpen}
        onCancel={() => {
          if (!isPending) setConfirmOpen(false);
        }}
        onConfirm={runSweep}
        title="Release abandoned orders?"
        description="Re-verifies every PENDING Paystack order older than 30 minutes with Paystack. Paid-but-stuck orders are promoted to CONFIRMED; genuinely abandoned ones are CANCELLED and their stock restored."
        confirmLabel="Run sweep"
        isPending={isPending}
      />
    </>
  );
}
