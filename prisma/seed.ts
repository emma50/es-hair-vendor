/**
 * Prisma seed — baseline defaults only.
 *
 * Under the revamped auth architecture, the admin `User` row cannot
 * be created by the seed: its `id` is a UUID that must match the
 * Supabase Auth user id, and the seed has no way to mint a Supabase
 * user. Admin provisioning is therefore split out into a dedicated
 * script that creates the Supabase Auth record AND the Prisma row in
 * lockstep:
 *
 *   pnpm db:admin:provision     # see scripts/dev-db/provision-admin-auth.ts
 *
 * What this seed does:
 *   1. Upsert the `StoreSettings` singleton (id = 'default').
 *
 * Everything else — demo catalog, mock data — lives in `scripts/dev-db/*`:
 *
 *   pnpm db:demo:populate     # curated showroom catalog (idempotent)
 *   pnpm db:mock:populate     # volume/mock data for load testing
 *   pnpm db:mock:read         # inspect mock data in the DB
 *   pnpm db:mock:update       # mutate mock data (cycle statuses, etc.)
 *   pnpm db:mock:delete       # remove mock data only
 *
 * This file runs automatically on `prisma migrate reset` (unless
 * --skip-seed is passed) and can be invoked directly with `pnpm db:seed`.
 * It is intentionally small, deterministic, and idempotent.
 */
import { prisma } from '@/lib/db-admin';
import { runScript } from '../scripts/dev-db/client';

async function main(): Promise<void> {
  console.log('🌱 Seeding baseline defaults...\n');

  // ─── StoreSettings singleton ─────────────────────────────────────
  // The admin settings page and the storefront announcement bar both
  // query this row. Without it, `getStoreSettings()` falls back to
  // DEFAULT_STORE_SETTINGS (via safeFindOne) but the admin has no row
  // to edit. Creating the `default` row on seed gives the admin an
  // immediately-editable record with sensible placeholder values.
  await prisma.storeSettings.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      storeName: 'Emmanuel Sarah Hair',
      storeEmail: 'hello@eshair.com',
      storePhone: '+234 812 345 6789',
      whatsappNumber: '+2348123456789',
      currency: 'NGN',
      shippingFee: 2500,
      freeShippingMin: 100000,
      // Announcement bar is intentionally null — the storefront treats
      // a missing/blank value as "hidden". The admin opts in by setting
      // it from the admin settings page.
      announcementBar: null,
    },
  });
  console.log('  ✓ StoreSettings (default)');

  console.log('\n✅ Baseline seed complete.');
  console.log(
    '   → Run `pnpm db:admin:provision` to create the admin account.',
  );
  console.log(
    '   → Run `pnpm db:demo:populate` to load the showroom catalog.\n',
  );
}

runScript(main, 'seed');
