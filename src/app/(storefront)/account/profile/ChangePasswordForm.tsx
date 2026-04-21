'use client';

import { useRef, useState, useTransition } from 'react';
import { KeyRound } from 'lucide-react';
import { updatePassword } from '@/app/actions/auth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';

export function ChangePasswordForm() {
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isPending) return;

    const form = new FormData(e.currentTarget);
    const values = Object.fromEntries(form.entries());

    startTransition(async () => {
      setFieldErrors({});
      const result = await updatePassword(values);
      if (!result.success) {
        toast(result.error, 'error');
        if (result.fieldErrors) setFieldErrors(result.fieldErrors);
        return;
      }
      // Surface the server-provided side-effect note (other sessions
      // were invalidated) so the user isn't surprised when a second
      // browser/tab asks them to sign in again.
      toast(result.message ?? 'Password updated.', 'success');
      formRef.current?.reset();
    });
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      noValidate
      className="grid gap-5 sm:grid-cols-2"
    >
      <Input
        name="currentPassword"
        type="password"
        label="Current password"
        autoComplete="current-password"
        required
        error={fieldErrors.currentPassword?.[0]}
        className="sm:col-span-2"
      />
      <Input
        name="newPassword"
        type="password"
        label="New password"
        autoComplete="new-password"
        hint="At least 8 characters with upper & lower case and a number."
        required
        error={fieldErrors.newPassword?.[0]}
      />
      <Input
        name="confirmPassword"
        type="password"
        label="Confirm new password"
        autoComplete="new-password"
        required
        error={fieldErrors.confirmPassword?.[0]}
      />
      <div className="sm:col-span-2">
        <Button type="submit" isLoading={isPending}>
          <KeyRound className="mr-2 h-4 w-4" />
          Update password
        </Button>
      </div>
    </form>
  );
}
