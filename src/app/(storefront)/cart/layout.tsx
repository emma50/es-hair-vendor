import type { Metadata } from 'next';

/**
 * The `/cart` page is rendered client-side (the cart lives in
 * localStorage and has to hydrate before we know what to display).
 * Client components can't export `metadata`, so this layout is the
 * only spot we can set a sensible `<title>` / no-index directive
 * without coupling the shell to server-side logic the page itself
 * doesn't need.
 */
export const metadata: Metadata = {
  title: 'Your Cart',
  description: 'Review the items in your cart before checkout.',
  robots: { index: false, follow: false },
};

export default function CartLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
