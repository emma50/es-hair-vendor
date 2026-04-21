'use client';

import { ErrorState } from '@/components/shared/ErrorState';
import { Settings } from 'lucide-react';

export default function AdminSettingsError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorState
      icon={Settings}
      title="Couldn't load settings"
      message="We hit a snag loading store settings. Try refreshing — if it keeps failing, head back to the dashboard."
      onRetry={reset}
      retryLabel="Try again"
      backHref="/admin"
      backLabel="Dashboard"
    />
  );
}
