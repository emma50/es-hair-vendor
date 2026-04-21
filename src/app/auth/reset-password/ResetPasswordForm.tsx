'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check, KeyRound } from 'lucide-react';
import { resetPassword } from '@/app/actions/auth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export function ResetPasswordForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [done, setDone] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isPending) return;

    const form = new FormData(e.currentTarget);
    const values = Object.fromEntries(form.entries());

    startTransition(async () => {
      setError(null);
      setFieldErrors({});

      const result = await resetPassword(values);
      if (!result.success) {
        setError(result.error);
        if (result.fieldErrors) setFieldErrors(result.fieldErrors);
        return;
      }

      setDone(true);
      // Give the success state a beat to register, then send them to
      // login. Using router.push so the browser cookies get flushed.
      setTimeout(() => {
        router.push('/auth/login?verified=1');
        router.refresh();
      }, 1500);
    });
  }

  if (done) {
    return (
      <div className="border-success/30 bg-success/10 flex flex-col items-center gap-3 rounded-xl border px-5 py-6 text-center">
        <div className="bg-success/10 rounded-full p-3">
          <Check className="text-success h-6 w-6" />
        </div>
        <h2 className="font-display text-ivory text-lg font-semibold">
          Password updated
        </h2>
        <p className="text-silver text-sm">Redirecting you to sign in…</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {error && (
        <div
          role="alert"
          className="border-error/30 bg-error/10 text-error rounded-lg border px-4 py-3 text-sm"
        >
          {error}
        </div>
      )}

      <Input
        name="password"
        type="password"
        label="New password"
        autoComplete="new-password"
        required
        error={fieldErrors.password?.[0]}
      />

      <Input
        name="confirmPassword"
        type="password"
        label="Confirm new password"
        autoComplete="new-password"
        required
        error={fieldErrors.confirmPassword?.[0]}
      />

      <Button type="submit" isLoading={isPending} className="w-full" size="lg">
        <KeyRound className="mr-2 h-4 w-4" />
        Update password
      </Button>
    </form>
  );
}
