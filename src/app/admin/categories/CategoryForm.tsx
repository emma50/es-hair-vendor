'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { createCategory } from '@/app/actions/categories';

export function CategoryForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  // Controlled so we can deterministically clear inputs after a
  // successful submit without reaching for `e.target.reset()` inside
  // an async transition callback (which can race with re-renders).
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isPending) return;

    startTransition(async () => {
      setFieldErrors({});
      const result = await createCategory({ name, description });
      if (!result.success) {
        toast(result.error, 'error');
        if (result.fieldErrors) setFieldErrors(result.fieldErrors);
        return;
      }
      toast('Category created!', 'success');
      setName('');
      setDescription('');
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="border-slate bg-charcoal space-y-3 rounded-lg border p-4"
      aria-label="Create category"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <Input
            name="name"
            label="Category name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Wigs"
            required
            autoComplete="off"
            error={fieldErrors.name?.[0]}
          />
        </div>
        <div className="flex-1">
          <Input
            name="description"
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional — shown on the category landing page"
            autoComplete="off"
            error={fieldErrors.description?.[0]}
          />
        </div>
        <Button type="submit" isLoading={isPending} size="md">
          <Plus className="h-4 w-4" /> Add
        </Button>
      </div>
    </form>
  );
}
