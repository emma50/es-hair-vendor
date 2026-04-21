'use client';

import { cn } from '@/lib/utils';

export interface VariantLean {
  id: string;
  label: string;
  price: number | string | { toNumber?: () => number };
  stockQuantity: number;
  isActive: boolean;
}

interface VariantSelectorProps {
  variants: VariantLean[];
  selectedId: string | null;
  onSelect: (variant: VariantLean) => void;
}

export function VariantSelector({
  variants,
  selectedId,
  onSelect,
}: VariantSelectorProps) {
  const activeVariants = variants.filter((v) => v.isActive);

  if (activeVariants.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-pearl text-sm font-medium">Select Option</p>
      <div className="flex flex-wrap gap-2">
        {activeVariants.map((variant) => {
          const isOutOfStock = variant.stockQuantity <= 0;
          return (
            <button
              key={variant.id}
              onClick={() => !isOutOfStock && onSelect(variant)}
              disabled={isOutOfStock}
              className={cn(
                'rounded-full border px-4 py-2 text-sm font-medium transition-colors',
                selectedId === variant.id
                  ? 'border-gold bg-gold/10 text-gold'
                  : isOutOfStock
                    ? 'border-slate text-muted cursor-not-allowed line-through'
                    : 'border-slate text-silver hover:border-gold hover:text-pearl',
              )}
              aria-label={`${variant.label}${isOutOfStock ? ' (out of stock)' : ''}`}
            >
              {variant.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
