'use client';

import { ErrorState } from '@/components/shared/ErrorState';
import { LayoutDashboard } from 'lucide-react';

export default function AdminError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorState
      icon={LayoutDashboard}
      title="Dashboard error"
      message="Something went wrong loading this page. Try refreshing — if the issue continues, head back to the dashboard."
      onRetry={reset}
      retryLabel="Refresh"
      backHref="/admin"
      backLabel="Dashboard"
    />
  );
}
