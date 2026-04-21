import { prisma } from '@/lib/prisma';
import { serialize } from '@/lib/utils';
import { safeQuery } from './safe';

/**
 * Default store settings returned when the DB is unreachable or the row
 * does not yet exist. Kept as a single source of truth so every call site
 * sees the same fallback shape.
 */
const DEFAULT_STORE_SETTINGS = {
  id: 'default',
  storeName: 'Emmanuel Sarah Hair',
  storeEmail: null as string | null,
  storePhone: null as string | null,
  whatsappNumber: null as string | null,
  currency: 'NGN',
  shippingFee: 0,
  freeShippingMin: null as number | null,
  announcementBar: null as string | null,
  isMaintenanceMode: false,
  metadata: null as unknown,
  updatedAt: new Date(0),
};

/**
 * Storefront layout — only needs the announcement bar text.
 *
 * The announcement is fully optional and must never crash the layout.
 * Returns `null` (which hides the bar) on every failure mode:
 *   - row missing / table empty
 *   - StoreSettings.announcementBar is null
 *   - database unreachable (dev without DB, Supabase pause, network blip)
 *   - table not yet migrated
 */
export async function getAnnouncementBar(): Promise<string | null> {
  return safeQuery(
    async () => {
      const result = await prisma.storeSettings.findUnique({
        where: { id: 'default' },
        select: { announcementBar: true },
      });
      return result?.announcementBar ?? null;
    },
    null,
    'getAnnouncementBar',
  );
}

/**
 * Full store settings — admin settings page and order creation.
 *
 * Falls back to `DEFAULT_STORE_SETTINGS` when the row is missing OR when
 * the database is unreachable, so the admin settings page always renders
 * a usable form instead of crashing.
 */
export async function getStoreSettings() {
  return safeQuery(
    async () => {
      const settings = await prisma.storeSettings.findUnique({
        where: { id: 'default' },
      });
      return settings ? serialize(settings) : DEFAULT_STORE_SETTINGS;
    },
    DEFAULT_STORE_SETTINGS,
    'getStoreSettings',
  );
}
