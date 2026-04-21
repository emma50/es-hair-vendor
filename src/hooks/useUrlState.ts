'use client';

import { useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { useStableNavigation } from '@/hooks/useStableNavigation';

/**
 * useUrlState — manages filter/sort/search state via URL searchParams.
 *
 * The URL is the single source of truth for shareable, bookmarkable state.
 * This hook centralizes the pattern used by CategoryFilter, SortSelector,
 * and any other component that drives navigation via searchParams.
 *
 * Usage:
 *   const { get, set, remove, buildUrl } = useUrlState('/products', 150);
 *   const category = get('category');
 *   set('category', 'wigs');           // navigates to /products?category=wigs
 *   set('sort', 'price-asc');          // preserves other params
 *   remove('category');                // removes param and navigates
 */
export function useUrlState(basePath: string, debounceMs = 150) {
  const searchParams = useSearchParams();
  const { navigate, isNavigating } = useStableNavigation(debounceMs);

  /** Read a search param value (returns '' if absent) */
  const get = useCallback(
    (key: string): string => searchParams.get(key) || '',
    [searchParams],
  );

  /** Build a URL string from current params with modifications applied */
  const buildUrl = useCallback(
    (changes: Record<string, string | null>): string => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(changes)) {
        if (value === null) {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }
      const qs = params.toString();
      return qs ? `${basePath}?${qs}` : basePath;
    },
    [searchParams, basePath],
  );

  /** Set one or more params and navigate. Pass null to remove a param. */
  const update = useCallback(
    (changes: Record<string, string | null>) => {
      navigate(buildUrl(changes));
    },
    [navigate, buildUrl],
  );

  /** Set a single param and navigate (resets page) */
  const set = useCallback(
    (key: string, value: string) => {
      update({ [key]: value, page: null });
    },
    [update],
  );

  /** Remove a single param and navigate (resets page) */
  const remove = useCallback(
    (key: string) => {
      update({ [key]: null, page: null });
    },
    [update],
  );

  return {
    /** Read a search param value */
    get,
    /** Set a param and navigate (resets page) */
    set,
    /** Remove a param and navigate (resets page) */
    remove,
    /** Apply multiple param changes at once and navigate */
    update,
    /** Build URL without navigating (for links) */
    buildUrl,
    /** Whether a navigation is in-flight */
    isNavigating,
    /** Raw searchParams for advanced use */
    searchParams,
  };
}
