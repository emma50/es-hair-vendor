import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/get-user';
import { SignUpForm } from './SignUpForm';

/**
 * Customer self-serve signup page. Admin accounts are provisioned out
 * of band via `pnpm db:admin:provision` — there is deliberately no way
 * to signup as ADMIN from the UI.
 */
export default async function SignUpPage() {
  const current = await getCurrentUser();
  if (current) {
    redirect(current.appUser.role === 'ADMIN' ? '/admin' : '/account');
  }

  return (
    <div className="w-full max-w-md">
      <div className="border-slate/60 bg-charcoal/80 shadow-card relative overflow-hidden rounded-2xl border p-8 backdrop-blur-xl sm:p-10">
        <div className="mb-8 text-center">
          <p className="text-gold mb-3 overline">Join us</p>
          <h1 className="font-display text-ivory text-2xl font-semibold sm:text-3xl">
            Create your account
          </h1>
          <p className="text-silver mt-2 text-sm">
            Track your orders and check out faster every time.
          </p>
        </div>

        <SignUpForm />

        <p className="text-silver mt-6 text-center text-sm">
          Already have an account?{' '}
          <Link
            href="/auth/login"
            className="text-gold hover:text-gold-light font-medium underline-offset-4 hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
