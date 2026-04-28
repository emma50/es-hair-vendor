'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { deleteProduct, setProductActive } from '@/app/actions/products';

interface ProductRowActionsProps {
  productId: string;
  productName: string;
  isActive: boolean;
}

/**
 * Admin list actions for a product row: edit, hide/unhide, soft-delete.
 * Soft-delete (`deleteProduct`) only flips `isActive` — existing orders
 * stay intact and the product is simply hidden from the storefront.
 */
export function ProductRowActions({
  productId,
  productName,
  isActive,
}: ProductRowActionsProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);

  function handleToggle() {
    startTransition(async () => {
      const result = await setProductActive(productId, !isActive);
      if (!result.success) {
        toast(result.error, 'error');
        return;
      }
      toast(
        isActive ? 'Product hidden from storefront.' : 'Product is now live.',
        'success',
      );
      router.refresh();
    });
  }

  function confirmDelete() {
    startTransition(async () => {
      const result = await deleteProduct(productId);
      if (!result.success) {
        toast(result.error, 'error');
        setConfirmOpen(false);
        return;
      }
      toast('Product hidden.', 'success');
      setConfirmOpen(false);
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-2">
      <Link
        href={`/admin/products/${productId}`}
        aria-label={`Edit ${productName}`}
      >
        <Button type="button" size="sm" variant="ghost" disabled={isPending}>
          <Pencil className="h-4 w-4" />
        </Button>
      </Link>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={handleToggle}
        disabled={isPending}
        aria-label={isActive ? `Hide ${productName}` : `Show ${productName}`}
      >
        {isActive ? (
          <EyeOff className="h-4 w-4" />
        ) : (
          <Eye className="h-4 w-4" />
        )}
      </Button>
      {isActive && (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => setConfirmOpen(true)}
          disabled={isPending}
          aria-label={`Hide ${productName} from storefront`}
        >
          <Trash2 className="text-error/80 h-4 w-4" />
        </Button>
      )}
      <ConfirmDialog
        open={confirmOpen}
        onCancel={() => {
          if (!isPending) setConfirmOpen(false);
        }}
        onConfirm={confirmDelete}
        title={`Hide "${productName}" from the storefront?`}
        description="Existing orders will still show this product; you can re-publish it any time."
        confirmLabel="Hide product"
        cancelLabel="Keep live"
        variant="destructive"
        isPending={isPending}
      />
    </div>
  );
}
