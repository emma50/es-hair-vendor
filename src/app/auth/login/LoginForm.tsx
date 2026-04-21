'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { LogIn } from 'lucide-react';
import { signIn } from '@/app/actions/auth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { safeRedirectPath } from '@/lib/safe-redirect';

interface LoginFormProps {
  redirectTo?: string;
}

export function LoginForm({ redirectTo }: LoginFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isPending) return;

    const form = new FormData(e.currentTarget);
    const values = Object.fromEntries(form.entries());

    startTransition(async () => {
      setError(null);
      setFieldErrors({});

      const result = await signIn(values);
      if (!result.success) {
        setError(result.error);
        if (result.fieldErrors) setFieldErrors(result.fieldErrors);
        return;
      }

      // Defence in depth: the server page already sanitises `redirectTo`
      // before passing it in, but `result.data.redirectTo` comes from
      // the server action (which bases it on the user's role). Run the
      // same-origin guard on whichever we end up using so a rogue
      // action response can't open-redirect the browser.
      const destination =
        safeRedirectPath(redirectTo) ??
        safeRedirectPath(result.data.redirectTo) ??
        '/account';
      // router.push gives us a client-side transition, but we also
      // need a full refresh so server components pick up the new
      // Supabase cookies on the next request.
      router.push(destination);
      router.refresh();
    });
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
        autoComplete="current-password"
        required
        error={fieldErrors.password?.[0]}
      />

      <Button type="submit" isLoading={isPending} className="w-full" size="lg">
        <LogIn className="mr-2 h-4 w-4" />
        Sign in
      </Button>
    </form>
  );
}
