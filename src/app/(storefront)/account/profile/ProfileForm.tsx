'use client';

import { useState, useTransition } from 'react';
import { Save } from 'lucide-react';
import { updateProfile } from '@/app/actions/account';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';

interface ProfileFormProps {
  initialName: string;
  initialEmail: string;
}

export function ProfileForm({ initialName, initialEmail }: ProfileFormProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isPending) return;

    const form = new FormData(e.currentTarget);
    const values = Object.fromEntries(form.entries());

    startTransition(async () => {
      setFieldErrors({});
      const result = await updateProfile(values);
      if (!result.success) {
        toast(result.error, 'error');
        if (result.fieldErrors) setFieldErrors(result.fieldErrors);
        return;
      }

      const emailChanged =
        String(values.email).toLowerCase() !== initialEmail.toLowerCase();
      toast(
        emailChanged
          ? 'Profile saved — check your new email for a confirmation link.'
          : 'Profile saved.',
        'success',
      );
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="grid gap-5 sm:grid-cols-2"
    >
      <Input
        name="name"
        label="Full name"
        defaultValue={initialName}
        autoComplete="name"
        required
        error={fieldErrors.name?.[0]}
      />
      <Input
        name="email"
        type="email"
        label="Email"
        defaultValue={initialEmail}
        autoComplete="email"
        required
        error={fieldErrors.email?.[0]}
      />
      <div className="sm:col-span-2">
        <Button type="submit" isLoading={isPending}>
          <Save className="mr-2 h-4 w-4" />
          Save changes
        </Button>
      </div>
    </form>
  );
}
