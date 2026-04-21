'use client';

import { ErrorState } from '@/components/shared/ErrorState';

export default function RootError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <ErrorState
        title="Something went wrong"
        message="We hit an unexpected problem. Please try again — if it keeps happening, head back to the home page."
        onRetry={reset}
        retryLabel="Try Again"
        backHref="/"
        backLabel="Go Home"
      />
    </div>
  );
}
