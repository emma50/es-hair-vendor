import Link from 'next/link';
import { ForgotPasswordForm } from './ForgotPasswordForm';

export default function ForgotPasswordPage() {
  return (
    <div className="w-full max-w-md">
      <div className="border-slate/60 bg-charcoal/80 shadow-card relative overflow-hidden rounded-2xl border p-8 backdrop-blur-xl sm:p-10">
        <div className="mb-8 text-center">
          <p className="text-gold mb-3 overline">Forgot password</p>
          <h1 className="font-display text-ivory text-2xl font-semibold sm:text-3xl">
            Reset your password
          </h1>
          <p className="text-silver mt-2 text-sm">
            Enter your email and we&apos;ll send you a link to reset your
            password.
          </p>
        </div>

        <ForgotPasswordForm />

        <p className="text-silver mt-6 text-center text-sm">
          Remembered it?{' '}
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
