import { formatNaira } from '@/lib/formatters';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';

interface PriceDisplayProps {
  price: number | string;
  compareAtPrice?: number | string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeStyles = {
  sm: 'text-[0.95rem]',
  md: 'text-xl',
  lg: 'text-3xl',
};

export function PriceDisplay({
  price,
  compareAtPrice,
  size = 'md',
  className,
}: PriceDisplayProps) {
  const currentPrice = typeof price === 'string' ? parseFloat(price) : price;
  const oldPrice = compareAtPrice
    ? typeof compareAtPrice === 'string'
      ? parseFloat(compareAtPrice)
      : compareAtPrice
    : null;
  const hasDiscount = oldPrice && oldPrice > currentPrice;
  const discountPercent = hasDiscount
    ? Math.round(((oldPrice - currentPrice) / oldPrice) * 100)
    : 0;

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <span
        className={cn(
          'text-gradient-gold font-display font-semibold tracking-tight',
          sizeStyles[size],
        )}
      >
        {formatNaira(currentPrice)}
      </span>
      {hasDiscount && (
        <>
          <span className="text-muted text-xs line-through decoration-1">
            {formatNaira(oldPrice)}
          </span>
          <Badge variant="success">&minus;{discountPercent}%</Badge>
        </>
      )}
    </div>
  );
}
