import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { AuthPageLayout } from '@/components/layout/AuthPageLayout';

/**
 * Shared shell for every auth route — login, signup, forgot-password,
 * reset-password, and the email callback. AuthPageLayout handles the
 * centered card container + "Back to store" escape hatch.
 */
// Auth pages don't belong in search results — there's no content to
// index, and links from an SERP land the user on a login card rather
// than the product / content they were searching for. `noindex, follow`
// keeps the pages discoverable to crawlers that follow internal links
// (so they don't drop the sitemap), but excludes them from the index.
export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

export default function AuthLayout({ children }: { children: ReactNode }) {
  return <AuthPageLayout>{children}</AuthPageLayout>;
}
