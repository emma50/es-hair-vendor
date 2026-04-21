'use client';

import { useRef, useCallback, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Provides debounced, abort-safe navigation that:
 * 1. Debounces rapid URL changes (filters, sort, search).
 * 2. Cancels stale navigations — only the latest fires.
 * 3. Exposes `isNavigating` for loading indicators.
 */
export function useStableNavigation(delay = 200) {
  const router = useRouter();
  const [isNavigating, startTransition] = useTransition();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestUrlRef = useRef<string | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const navigate = useCallback(
    (url: string) => {
      // Cancel any pending debounced navigation
      if (timerRef.current) clearTimeout(timerRef.current);

      // Store the latest URL so we can verify it's still current
      latestUrlRef.current = url;

      timerRef.current = setTimeout(() => {
        // Only navigate if this URL is still the latest requested
        if (latestUrlRef.current === url) {
          startTransition(() => {
            router.push(url);
          });
        }
      }, delay);
    },
    [router, delay, startTransition],
  );

  return { navigate, isNavigating };
}
