'use client';

import { ErrorState } from '@/components/shared/ErrorState';
import { Tag } from 'lucide-react';

export default function AdminCategoriesError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorState
      icon={Tag}
      title="Couldn't load categories"
      message="We hit a snag loading the categories. Try refreshing — if it keeps failing, head back to the dashboard."
      onRetry={reset}
      retryLabel="Try again"
      backHref="/admin"
      backLabel="Dashboard"
    />
  );
}
