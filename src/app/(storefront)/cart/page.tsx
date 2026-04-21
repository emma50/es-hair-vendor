'use client';

import { ShoppingBag } from 'lucide-react';
import { useCart } from '@/hooks/useCart';
import { CartItem } from '@/components/cart/CartItem';
import { CartSummary } from '@/components/cart/CartSummary';
import { WhatsAppCheckout } from '@/components/checkout/WhatsAppCheckout';
import { EmptyState } from '@/components/shared/EmptyState';
import { estimateShippingCost } from '@/lib/constants';
import { CartValidator } from './CartValidator';

export default function CartPage() {
  const { items, subtotal, removeItem, updateQuantity, isHydrated } = useCart();

  const shippingCost = estimateShippingCost(subtotal);

  if (!isHydrated) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8">
        <h1 className="font-display text-ivory mb-8 text-3xl font-bold">
          Your Cart
        </h1>
        <div className="bg-charcoal h-64 animate-pulse rounded-lg" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8">
        <h1 className="font-display text-ivory mb-8 text-3xl font-bold">
          Your Cart
        </h1>
        <EmptyState
          icon={ShoppingBag}
          title="Your cart is empty"
          description="Looks like you haven't added anything yet. Browse our collection to find something you'll love."
          actionLabel="Shop Now"
          actionHref="/products"
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/*
       * Reconcile the cart against server-side ground-truth on mount.
       * Drops deactivated items, clamps quantities, refreshes prices —
       * and surfaces a toast if anything had to change, so the
       * customer doesn't discover stale data for the first time at
       * the checkout step.
       */}
      <CartValidator />
      <h1 className="font-display text-ivory mb-8 text-3xl font-bold">
        Your Cart
      </h1>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {items.map((item) => (
            <CartItem
              key={`${item.productId}-${item.variantId}`}
              item={item}
              onUpdateQuantity={(qty) =>
                updateQuantity(item.productId, item.variantId, qty)
              }
              onRemove={() => removeItem(item.productId, item.variantId)}
            />
          ))}
        </div>
        <div>
          <CartSummary
            subtotal={subtotal}
            shippingCost={shippingCost}
            whatsappCheckout={<WhatsAppCheckout shippingCost={shippingCost} />}
          />
        </div>
      </div>
    </div>
  );
}
