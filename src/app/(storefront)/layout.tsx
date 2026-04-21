import { Header, type HeaderSession } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { AnnouncementBar } from '@/components/layout/AnnouncementBar';
import { CartSessionBridge } from '@/components/cart/CartSessionBridge';
import { getAnnouncementBar } from '@/lib/queries/settings';
import { getCurrentUser } from '@/lib/auth/get-user';

export default async function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Run the announcement + session lookups in parallel — both are small
  // and independent, so there's no reason to serialize them.
  const [announcement, current] = await Promise.all([
    getAnnouncementBar(),
    getCurrentUser(),
  ]);

  const session: HeaderSession | null = current
    ? {
        email: current.email,
        name: current.appUser.name,
        role: current.appUser.role,
      }
    : null;

  return (
    <>
      {/* Keeps the Zustand cart scoped to the current user. Must be
          rendered before any cart-reading component (CartIcon, etc.). */}
      <CartSessionBridge userId={current?.id ?? null} />
      {announcement && <AnnouncementBar message={announcement} />}
      <Header session={session} />
      <div className="flex-1">{children}</div>
      <Footer />
    </>
  );
}
