'use client';

import { ErrorState } from '@/components/shared/ErrorState';
import { CreditCard } from 'lucide-react';

export default function CheckoutError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center px-4">
      <ErrorState
        icon={CreditCard}
        title="Checkout unavailable"
        message="We couldn't load the checkout page. Your cart items are safe — please try again in a moment."
        onRetry={reset}
        retryLabel="Try Again"
        backHref="/cart"
        backLabel="Back to Cart"
      />
    </div>
  );
}
