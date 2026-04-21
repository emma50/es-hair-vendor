import Link from 'next/link';
import { ResetPasswordForm } from './ResetPasswordForm';

/**
 * Destination of the Supabase password-recovery email link.
 *
 * IMPORTANT: the recovery link encodes a single-use token that
 * Supabase exchanges for a session cookie as soon as the link is
 * visited. By the time this page renders on the client, the user is
 * effectively signed in for the duration of the password change. The
 * ResetPasswordForm then calls `supabase.auth.updateUser({ password })`
 * on that session.
 */
export default function ResetPasswordPage() {
  return (
    <div className="w-full max-w-md">
      <div className="border-slate/60 bg-charcoal/80 shadow-card relative overflow-hidden rounded-2xl border p-8 backdrop-blur-xl sm:p-10">
        <div className="mb-8 text-center">
          <p className="text-gold mb-3 overline">Reset password</p>
          <h1 className="font-display text-ivory text-2xl font-semibold sm:text-3xl">
            Choose a new password
          </h1>
          <p className="text-silver mt-2 text-sm">
            Pick something strong — at least 8 characters with a mix of upper
            and lower case plus a number.
          </p>
        </div>

        <ResetPasswordForm />

        <p className="text-silver mt-6 text-center text-sm">
          <Link
            href="/auth/login"
            className="text-gold hover:text-gold-light font-medium underline-offset-4 hover:underline"
          >
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
