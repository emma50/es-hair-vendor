'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { UserPlus, Mail } from 'lucide-react';
import { signUpCustomer } from '@/app/actions/auth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export function SignUpForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [confirmEmailSent, setConfirmEmailSent] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isPending) return;

    const form = new FormData(e.currentTarget);
    const values = Object.fromEntries(form.entries());

    startTransition(async () => {
      setError(null);
      setFieldErrors({});

      const result = await signUpCustomer(values);
      if (!result.success) {
        setError(result.error);
        if (result.fieldErrors) setFieldErrors(result.fieldErrors);
        return;
      }

      if (result.data.needsEmailConfirmation) {
        setConfirmEmailSent(values.email as string);
        return;
      }

      // Email confirmation disabled in this Supabase project — the user
      // is already authenticated, drop them straight into their account.
      router.push('/account');
      router.refresh();
    });
  }

  if (confirmEmailSent) {
    return (
      <div className="border-gold/30 bg-gold/5 flex flex-col items-center gap-3 rounded-xl border px-5 py-6 text-center">
        <div className="bg-gold/10 rounded-full p-3">
          <Mail className="text-gold h-6 w-6" />
        </div>
        <h2 className="font-display text-ivory text-lg font-semibold">
          Check your inbox
        </h2>
        <p className="text-silver text-sm leading-relaxed">
          We&apos;ve sent a verification email to{' '}
          <span className="text-pearl font-medium">{confirmEmailSent}</span>.
          Click the link in the email to activate your account, then sign in.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {error && (
        <div
          role="alert"
          className="text-error border-error/30 rounded-lg border bg-fuchsia-50 p-2 text-sm"
        >
          {error}
        </div>
      )}

      <Input
        name="name"
        label="Full name"
        autoComplete="name"
        required
        error={fieldErrors.name?.[0]}
      />

      <Input
        name="email"
        type="email"
        label="Email"
        autoComplete="email"
        required
        error={fieldErrors.email?.[0]}
      />

      <Input
        name="password"
        type="password"
        label="Password"
        autoComplete="new-password"
        hint="At least 8 characters, mixing upper & lower case and a number."
        required
        error={fieldErrors.password?.[0]}
      />

      <Input
        name="confirmPassword"
        type="password"
        label="Confirm password"
        autoComplete="new-password"
        required
        error={fieldErrors.confirmPassword?.[0]}
      />

      <Button type="submit" isLoading={isPending} className="w-full" size="lg">
        <UserPlus className="mr-2 h-4 w-4" />
        Create account
      </Button>

      <p className="text-muted text-center text-[11px] leading-relaxed">
        By creating an account, you agree to our terms of service and privacy
        policy.
      </p>
    </form>
  );
}
