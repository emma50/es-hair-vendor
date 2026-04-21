'use client';

import { useRef, useCallback } from 'react';

/**
 * Deduplicates concurrent identical async calls.
 * If the same key is already in-flight, returns the existing promise
 * instead of firing a new request.
 *
 * Usage:
 *   const dedup = useRequestDedup();
 *   const result = await dedup('create-order', () => createOrder(data));
 */
export function useRequestDedup() {
  const inflightRef = useRef<Map<string, Promise<unknown>>>(new Map());

  return useCallback(
    async <T>(key: string, fn: () => Promise<T>): Promise<T> => {
      const existing = inflightRef.current.get(key);
      if (existing) {
        return existing as Promise<T>;
      }

      const promise = fn().finally(() => {
        inflightRef.current.delete(key);
      });

      inflightRef.current.set(key, promise);
      return promise;
    },
    [],
  );
}
