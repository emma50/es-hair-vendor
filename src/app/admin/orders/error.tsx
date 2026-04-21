'use client';

import { ErrorState } from '@/components/shared/ErrorState';
import { ClipboardList } from 'lucide-react';

export default function AdminOrdersError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorState
      icon={ClipboardList}
      title="Couldn't load orders"
      message="We hit a snag loading the orders list. Try refreshing — if it keeps failing, head back to the dashboard."
      onRetry={reset}
      retryLabel="Try again"
      backHref="/admin"
      backLabel="Dashboard"
    />
  );
}
