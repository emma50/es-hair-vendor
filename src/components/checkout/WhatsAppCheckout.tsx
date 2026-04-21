'use client';

import { Button } from '@/components/ui/Button';
import { useCart } from '@/hooks/useCart';
import { buildWhatsAppOrderUrl } from '@/lib/whatsapp';
import { STORE_CONFIG } from '@/lib/constants';

interface WhatsAppCheckoutProps {
  shippingCost: number;
}

export function WhatsAppCheckout({ shippingCost }: WhatsAppCheckoutProps) {
  const { items, subtotal } = useCart();
  const whatsappNumber = STORE_CONFIG.whatsappNumber;

  if (!whatsappNumber || items.length === 0) return null;

  const url = buildWhatsAppOrderUrl(
    items,
    subtotal,
    shippingCost,
    whatsappNumber,
  );

  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="block">
      <Button variant="whatsapp" className="w-full">
        Order via WhatsApp
      </Button>
    </a>
  );
}
