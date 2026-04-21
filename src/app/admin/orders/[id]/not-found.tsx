import { EmptyState } from '@/components/shared/EmptyState';
import { ClipboardList } from 'lucide-react';

export default function OrderNotFound() {
  return (
    <EmptyState
      icon={ClipboardList}
      title="Order not found"
      description="This order doesn't exist or may have been removed. Go back to the orders list to find the order you're looking for."
      actionLabel="All Orders"
      actionHref="/admin/orders"
    />
  );
}
