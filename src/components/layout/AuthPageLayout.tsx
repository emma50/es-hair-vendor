import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

/**
 * AuthPageLayout
 *
 * Wraps admin auth pages (login, forgot-password, reset-password) with a
 * consistent escape route back to the public storefront. Because
 * AdminLayoutShell strips the sidebar for auth routes, without this wrapper
 * users would have zero navigation and be stranded on the auth flow.
 *
 * Every auth state (form, success, error, loading) should render inside this
 * layout so the escape hatch is always reachable.
 */
export function AuthPageLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center px-4">
      <Link
        href="/"
        className="text-muted hover:text-ivory focus-visible:ring-gold absolute top-6 left-6 inline-flex items-center gap-2 rounded-md px-2 py-1 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2"
        aria-label="Back to store home page"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to store
      </Link>
      {children}
    </div>
  );
}
