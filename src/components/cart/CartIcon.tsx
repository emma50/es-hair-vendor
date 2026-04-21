'use client';

import Link from 'next/link';
import { ShoppingBag } from 'lucide-react';
import { useCart } from '@/hooks/useCart';

export function CartIcon() {
  const { totalItems } = useCart();

  return (
    <Link
      href="/cart"
      className="text-pearl hover:text-gold relative rounded-md p-2 transition-colors"
      aria-label={`Cart, ${totalItems} items`}
    >
      <ShoppingBag className="h-6 w-6" />
      {totalItems > 0 && (
        <span className="bg-gold text-midnight absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold">
          {totalItems > 99 ? '99+' : totalItems}
        </span>
      )}
    </Link>
  );
}
