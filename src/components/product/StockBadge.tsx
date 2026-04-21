import { Badge } from '@/components/ui/Badge';
import { LOW_STOCK_THRESHOLD } from '@/lib/constants';

interface StockBadgeProps {
  quantity: number;
}

export function StockBadge({ quantity }: StockBadgeProps) {
  if (quantity <= 0) {
    return <Badge variant="error">Out of Stock</Badge>;
  }
  if (quantity <= LOW_STOCK_THRESHOLD) {
    return <Badge variant="warning">Low Stock — {quantity} left</Badge>;
  }
  return <Badge variant="success">In Stock</Badge>;
}
