'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { updateOrderNotes } from '@/app/actions/orders';

interface OrderNotesFormProps {
  orderId: string;
  currentNotes: string;
}

export function OrderNotesForm({ orderId, currentNotes }: OrderNotesFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isPending) return;
    const form = new FormData(e.currentTarget);
    const notes = form.get('adminNotes') as string;

    startTransition(async () => {
      const result = await updateOrderNotes(orderId, notes);
      if (result.success) {
        toast('Notes saved!', 'success');
        router.refresh();
      } else {
        toast(result.error, 'error');
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="border-slate bg-charcoal rounded-lg border p-6"
      aria-labelledby="admin-notes-heading"
    >
      <h2
        id="admin-notes-heading"
        className="font-display text-ivory mb-3 text-lg font-semibold"
      >
        Admin Notes
      </h2>
      <fieldset disabled={isPending} className="disabled:opacity-70">
        <Textarea
          name="adminNotes"
          defaultValue={currentNotes}
          placeholder="Internal notes about this order..."
          aria-label="Internal admin notes (not visible to the customer)"
        />
        <Button
          type="submit"
          isLoading={isPending}
          size="sm"
          className="mt-3 w-full"
        >
          Save Notes
        </Button>
      </fieldset>
    </form>
  );
}
