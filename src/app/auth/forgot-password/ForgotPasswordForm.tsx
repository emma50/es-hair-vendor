'use client';

import { useState, useTransition } from 'react';
import { Mail, Send } from 'lucide-react';
import { requestPasswordReset } from '@/app/actions/auth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export function ForgotPasswordForm() {
  const [isPending, startTransition] = useTransition();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [sentTo, setSentTo] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isPending) return;

    const form = new FormData(e.currentTarget);
    const email = String(form.get('email') ?? '');

    startTransition(async () => {
      setFieldErrors({});
      const result = await requestPasswordReset({ email });
      if (!result.success) {
        if (result.fieldErrors) setFieldErrors(result.fieldErrors);
        return;
      }
      // Always show success — Supabase intentionally does not reveal
      // whether the email exists (account-enumeration protection).
      setSentTo(email);
    });
  }

  if (sentTo) {
    return (
      <div className="border-gold/30 bg-gold/5 flex flex-col items-center gap-3 rounded-xl border px-5 py-6 text-center">
        <div className="bg-gold/10 rounded-full p-3">
          <Mail className="text-gold h-6 w-6" />
        </div>
        <h2 className="font-display text-ivory text-lg font-semibold">
          Check your inbox
        </h2>
        <p className="text-silver text-sm leading-relaxed">
          If an account exists for{' '}
          <span className="text-pearl font-medium">{sentTo}</span>, you&apos;ll
          receive an email with a link to reset your password.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <Input
        name="email"
        type="email"
        label="Email"
        autoComplete="email"
        required
        error={fieldErrors.email?.[0]}
      />
      <Button type="submit" isLoading={isPending} className="w-full" size="lg">
        <Send className="mr-2 h-4 w-4" />
        Send reset link
      </Button>
    </form>
  );
}
