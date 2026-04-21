import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Recursively converts Prisma Decimal objects to plain numbers
 * so data can be passed from Server Components to Client Components.
 * Uses duck-typing to avoid importing @prisma/client in client bundles.
 */
export function serialize<T>(data: T): T {
  return JSON.parse(
    JSON.stringify(data, (_key, value) => {
      if (
        value !== null &&
        typeof value === 'object' &&
        typeof value.toNumber === 'function'
      ) {
        return value.toNumber();
      }
      return value;
    }),
  ) as T;
}
