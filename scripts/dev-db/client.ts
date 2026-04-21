/**
 * Dev-db scripts entry point.
 *
 * Re-exports the shared admin Prisma client (`src/lib/db-admin.ts`) plus
 * the mock-data tagging convention that's specific to these scripts.
 *
 * The actual client wiring, .env loading, and production guard all live in
 * `src/lib/db-admin.ts` so `prisma/seed.ts` shares the same bootstrap.
 */
export { prisma, disconnect } from '@/lib/db-admin';
import { disconnect } from '@/lib/db-admin';

// ── Mock data tagging convention ─────────────────────────────────
// Every mock record is identifiable so `delete.ts` only touches mock rows.
export const MOCK = {
  /** Tag pushed into Product.tags */
  productTag: 'mock',
  /** Prefix used on Product.sku */
  skuPrefix: 'MOCK-',
  /** Prefix used on Order.orderNumber */
  orderPrefix: 'MOCK-',
  /** Email domain suffix for EmailSubscriber + mock orders */
  emailDomain: '@mock.eshair.dev',
} as const;

// ── Script runner ────────────────────────────────────────────────
/**
 * Wraps a script's `main()` with consistent error handling and a
 * clean disconnect. Every dev-db script should end with:
 *
 *   runScript(main);
 *
 * instead of the raw `.catch().finally(disconnect)` boilerplate.
 */
export function runScript(main: () => Promise<void>, label = 'script'): void {
  main()
    .catch((err) => {
      console.error(`\n❌ ${label} failed:`, err);
      process.exit(1);
    })
    .finally(disconnect);
}
