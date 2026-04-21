import { EmptyState } from '@/components/shared/EmptyState';
import { Package } from 'lucide-react';

export default function ProductNotFound() {
  return (
    <EmptyState
      icon={Package}
      title="Product not found"
      description="This product doesn't exist or may have been deleted. Go back to the products list to find what you're looking for."
      actionLabel="All Products"
      actionHref="/admin/products"
    />
  );
}
