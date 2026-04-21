'use client';

import { ErrorState } from '@/components/shared/ErrorState';
import { Package } from 'lucide-react';

export default function AdminProductsError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorState
      icon={Package}
      title="Couldn't load products"
      message="We hit a snag loading the product catalog. Try refreshing — if it keeps failing, head back to the dashboard."
      onRetry={reset}
      retryLabel="Try again"
      backHref="/admin"
      backLabel="Dashboard"
    />
  );
}
