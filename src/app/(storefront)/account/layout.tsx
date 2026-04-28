import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/get-user';
import { AccountSidebar } from '@/components/account/AccountSidebar';

// The customer account area is private, user-specific, and behind an
// auth redirect — crawlers should never see it. `title.template` lets
// the individual pages (orders list, profile, etc.) override the title
// while preserving the shared "Your Account" default when they don't.
export const metadata: Metadata = {
  title: {
    default: 'Your Account',
    template: '%s · Your Account',
  },
  description: 'Manage your orders, delivery details, and account preferences.',
  robots: { index: false, follow: false },
};

/**
 * Customer dashboard shell.
 *
 * Enforces authentication server-side as defense in depth against the
 * middleware being bypassed. Admins are routed to `/admin` instead of
 * seeing the customer surface — the customer dashboard is intentionally
 * CUSTOMER-facing (order history, profile), not an alternate admin view.
 */
export default async function AccountLayout({
  children,
}: {
  children: ReactNode;
}) {
  const current = await getCurrentUser();
  if (!current) {
    redirect('/auth/login?redirect=/account');
  }
  if (current.appUser.role === 'ADMIN') {
    redirect('/admin');
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <div className="grid gap-8 lg:grid-cols-[260px_1fr] lg:gap-10">
        <AccountSidebar
          name={current.appUser.name}
          email={current.appUser.email}
        />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
