import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/get-user';
import { safeRedirectPath } from '@/lib/safe-redirect';
import { LoginForm } from './LoginForm';

interface LoginPageProps {
  searchParams: Promise<{ redirect?: string; verified?: string }>;
}

/**
 * Shared sign-in page for customers and admins.
 *
 * If already signed in, redirects straight to the role-appropriate
 * landing page (or the `redirect` query param if provided). The
 * client-side LoginForm handles the actual credential POST.
 */
export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const current = await getCurrentUser();

  if (current) {
    const fallback = current.appUser.role === 'ADMIN' ? '/admin' : '/account';
    // Guard against open-redirect: only honour same-origin relative
    // paths. Anything off-origin (or a protocol-relative URL) falls
    // back to the role-appropriate landing page.
    const target = safeRedirectPath(params.redirect) ?? fallback;
    redirect(target);
  }

  // Sanitise before passing to the client so the form can't be tricked
  // into navigating off-origin even if JS manipulates the URL later.
  const safeRedirect = safeRedirectPath(params.redirect) ?? undefined;

  return (
    <div className="w-full max-w-md">
      <div className="border-slate/60 bg-charcoal/80 shadow-card relative overflow-hidden rounded-2xl border p-8 backdrop-blur-xl sm:p-10">
        <div className="mb-8 text-center">
          <p className="text-gold mb-3 overline">Welcome back</p>
          <h1 className="font-display text-ivory text-2xl font-semibold sm:text-3xl">
            Sign in to your account
          </h1>
          <p className="text-silver mt-2 text-sm">
            Access your orders, saved details, and personal dashboard.
          </p>
        </div>

        {params.verified === '1' && (
          <div className="border-success/30 bg-success/10 text-success mb-6 rounded-lg border px-4 py-3 text-sm">
            Email confirmed — you can sign in now.
          </div>
        )}

        <LoginForm redirectTo={safeRedirect} />

        <div className="mt-6 space-y-2 text-center text-sm">
          <p className="text-silver">
            Don&apos;t have an account?{' '}
            <Link
              href="/auth/signup"
              className="text-gold hover:text-gold-light font-medium underline-offset-4 hover:underline"
            >
              Create one
            </Link>
          </p>
          <p>
            <Link
              href="/auth/forgot-password"
              className="text-muted hover:text-silver text-xs underline-offset-4 hover:underline"
            >
              Forgot your password?
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
