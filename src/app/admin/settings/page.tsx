import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import { safeFindOne } from '@/lib/queries/safe';
import { serializeStoreSettings } from '@/lib/serialize';
import { SettingsForm } from './SettingsForm';

export const metadata: Metadata = {
  title: 'Store Settings | Admin',
};

export default async function AdminSettingsPage() {
  // safeFindOne → the settings page always renders (even with DB down) so
  // the admin isn't stranded on a generic error.tsx screen.
  const settings = await safeFindOne(
    () =>
      prisma.storeSettings.findUnique({
        where: { id: 'default' },
      }),
    'adminStoreSettings',
  );

  // Prisma `Decimal` values cannot cross the RSC → client component
  // boundary (React's serializer only accepts plain JSON-safe objects).
  // `serializeStoreSettings` centralises the Decimal → number conversion
  // so the SettingsForm never sees a raw Prisma row.
  const serialized = serializeStoreSettings(settings);

  return (
    <div>
      <h1 className="font-display text-ivory mb-6 text-2xl font-bold">
        Store Settings
      </h1>
      <SettingsForm settings={serialized} />
    </div>
  );
}
