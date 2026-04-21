'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { formatNaira } from '@/lib/formatters';
import type { CartItem as CartItemType } from '@/types/cart';

interface CartItemProps {
  item: CartItemType;
  onUpdateQuantity: (quantity: number) => void;
  onRemove: () => void;
}

export function CartItem({ item, onUpdateQuantity, onRemove }: CartItemProps) {
  return (
    <div className="border-slate flex gap-4 border-b py-4">
      <div className="bg-charcoal relative h-20 w-20 shrink-0 overflow-hidden rounded-md">
        <Image
          src={item.image}
          alt={item.name}
          fill
          sizes="80px"
          className="object-cover"
        />
      </div>
      <div className="flex flex-1 flex-col justify-between">
        <div>
          <Link
            href={`/products/${item.slug}`}
            className="text-ivory hover:text-gold text-sm font-medium"
          >
            {item.name}
          </Link>
          {item.variantName && (
            <p className="text-muted text-xs">{item.variantName}</p>
          )}
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onUpdateQuantity(item.quantity - 1)}
              className="border-slate text-silver hover:text-pearl flex h-8 w-8 items-center justify-center rounded-md border"
              aria-label="Decrease quantity"
            >
              <Minus className="h-3 w-3" />
            </button>
            <span className="text-pearl w-8 text-center text-sm">
              {item.quantity}
            </span>
            <button
              onClick={() =>
                onUpdateQuantity(Math.min(item.quantity + 1, item.maxStock))
              }
              disabled={item.quantity >= item.maxStock}
              className="border-slate text-silver hover:text-pearl flex h-8 w-8 items-center justify-center rounded-md border disabled:opacity-50"
              aria-label="Increase quantity"
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-gold text-sm font-semibold">
              {formatNaira(item.price * item.quantity)}
            </span>
            <button
              onClick={onRemove}
              className="text-muted hover:text-error rounded-md p-1"
              aria-label={`Remove ${item.name} from cart`}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
