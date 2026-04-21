'use client';

import { ErrorState } from '@/components/shared/ErrorState';
import { ShoppingBag } from 'lucide-react';

export default function StorefrontError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center px-4">
      <ErrorState
        icon={ShoppingBag}
        title="We couldn't load this page"
        message="Something went wrong on our end. Please try again — if it keeps happening, feel free to reach out to us on WhatsApp."
        onRetry={reset}
        retryLabel="Try Again"
        backHref="/products"
        backLabel="Browse Products"
      />
    </div>
  );
}
