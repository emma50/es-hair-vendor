import { EmptyState } from '@/components/shared/EmptyState';
import { Search } from 'lucide-react';

export default function ProductNotFound() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <EmptyState
        icon={Search}
        title="Product not found"
        description="This product doesn't exist or may have been removed. Browse our collection to find something you'll love."
        actionLabel="Browse Products"
        actionHref="/products"
      />
    </div>
  );
}
