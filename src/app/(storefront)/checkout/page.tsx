import type { Metadata } from 'next';
import { getCurrentUser } from '@/lib/auth/get-user';
import { CheckoutClient } from './CheckoutClient';

// Opt out of SEO on the checkout step. The page is only meaningful
// with a populated client cart, and we don't want bots indexing a
// half-filled form title or a redirect-to-cart shell.
export const metadata: Metadata = {
  title: 'Checkout',
  description: 'Securely complete your order.',
  robots: { index: false, follow: false },
};

/**
 * Checkout page — server component shell.
 *
 * Resolves the current user (if any) server-side so the client form
 * can render with a pre-filled name and email on first paint. Guest
 * checkout remains fully supported: `getCurrentUser()` returning
 * `null` simply yields empty initial values.
 *
 * The actual form logic (cart hydration, Paystack popup, WhatsApp
 * routing) lives in the client component; this shell only hands
 * down the prefill data.
 */
export default async function CheckoutPage() {
  const current = await getCurrentUser();

  return (
    <CheckoutClient
      initialName={current?.appUser.name ?? ''}
      initialEmail={current?.email ?? ''}
    />
  );
}
