'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { updateStoreSettings } from '@/app/actions/settings';
import type { SerializedStoreSettings } from '@/lib/serialize';

interface SettingsFormProps {
  settings: SerializedStoreSettings | null;
}

export function SettingsForm({ settings }: SettingsFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isPending) return;
    const form = new FormData(e.currentTarget);
    const formValues = {
      storeName: form.get('storeName') as string,
      storeEmail: form.get('storeEmail') as string,
      storePhone: form.get('storePhone') as string,
      whatsappNumber: form.get('whatsappNumber') as string,
      shippingFee: form.get('shippingFee'),
      freeShippingMin: form.get('freeShippingMin'),
      announcementBar: form.get('announcementBar') as string,
      isMaintenanceMode: form.get('isMaintenanceMode') === 'on',
    };

    startTransition(async () => {
      setFieldErrors({});
      const result = await updateStoreSettings(formValues);
      if (result.success) {
        toast('Settings saved!', 'success');
        router.refresh();
      } else {
        toast(result.error, 'error');
        if (result.fieldErrors) setFieldErrors(result.fieldErrors);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <fieldset disabled={isPending} className="space-y-6 disabled:opacity-70">
        <div className="border-slate bg-charcoal rounded-lg border p-6">
          <h2 className="font-display text-ivory mb-4 text-lg font-semibold">
            Store Info
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              name="storeName"
              label="Store Name"
              defaultValue={settings?.storeName || 'Emmanuel Sarah Hair'}
              required
              error={fieldErrors.storeName?.[0]}
            />
            <Input
              name="storeEmail"
              label="Email"
              type="email"
              defaultValue={settings?.storeEmail || ''}
              error={fieldErrors.storeEmail?.[0]}
            />
            <Input
              name="storePhone"
              label="Phone"
              defaultValue={settings?.storePhone || ''}
              error={fieldErrors.storePhone?.[0]}
            />
            <Input
              name="whatsappNumber"
              label="WhatsApp Number"
              defaultValue={settings?.whatsappNumber || ''}
              error={fieldErrors.whatsappNumber?.[0]}
            />
          </div>
        </div>

        <div className="border-slate bg-charcoal rounded-lg border p-6">
          <h2 className="font-display text-ivory mb-4 text-lg font-semibold">
            Shipping
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              name="shippingFee"
              label="Shipping Fee (₦)"
              type="number"
              step="0.01"
              defaultValue={settings?.shippingFee ?? 0}
              error={fieldErrors.shippingFee?.[0]}
            />
            <Input
              name="freeShippingMin"
              label="Free Shipping Min (₦)"
              type="number"
              step="0.01"
              defaultValue={settings?.freeShippingMin ?? ''}
              error={fieldErrors.freeShippingMin?.[0]}
            />
          </div>
        </div>

        <div className="border-slate bg-charcoal rounded-lg border p-6">
          <h2 className="font-display text-ivory mb-4 text-lg font-semibold">
            Storefront
          </h2>
          <Textarea
            name="announcementBar"
            label="Announcement Bar Text"
            defaultValue={settings?.announcementBar || ''}
            placeholder="Free shipping on orders over ₦100,000!"
            error={fieldErrors.announcementBar?.[0]}
          />
          <label className="text-pearl mt-4 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="isMaintenanceMode"
              defaultChecked={settings?.isMaintenanceMode ?? false}
              className="border-slate bg-graphite rounded"
            />
            Maintenance Mode
          </label>
        </div>
      </fieldset>
      <Button type="submit" isLoading={isPending}>
        Save Settings
      </Button>
    </form>
  );
}
