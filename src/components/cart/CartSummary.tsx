'use client';

import Link from 'next/link';
import { formatNaira } from '@/lib/formatters';
import { Button } from '@/components/ui/Button';

interface CartSummaryProps {
  subtotal: number;
  shippingCost: number;
  whatsappCheckout?: React.ReactNode;
}

export function CartSummary({
  subtotal,
  shippingCost,
  whatsappCheckout,
}: CartSummaryProps) {
  const total = subtotal + shippingCost;

  return (
    <div className="border-slate bg-charcoal rounded-lg border p-6">
      <h2 className="font-display text-ivory mb-4 text-lg font-semibold">
        Order Summary
      </h2>
      <div className="space-y-2 text-sm">
        <div className="text-silver flex justify-between">
          <span>Subtotal</span>
          <span>{formatNaira(subtotal)}</span>
        </div>
        <div className="text-silver flex justify-between">
          <span>Shipping</span>
          <span>{shippingCost === 0 ? 'Free' : formatNaira(shippingCost)}</span>
        </div>
        <div className="border-slate border-t pt-2">
          <div className="flex justify-between text-base font-semibold">
            <span className="text-pearl">Total</span>
            <span className="text-gold">{formatNaira(total)}</span>
          </div>
        </div>
      </div>
      <div className="mt-6 space-y-3">
        <Link href="/checkout" className="block">
          <Button className="w-full">Proceed to Checkout</Button>
        </Link>
        {whatsappCheckout}
      </div>
    </div>
  );
}
