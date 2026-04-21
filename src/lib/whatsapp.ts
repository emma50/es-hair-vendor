import type { CartItem } from '@/types/cart';
import { formatNaira } from './formatters';

export function normalizePhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('0')) {
    return '234' + cleaned.slice(1);
  }
  if (cleaned.startsWith('234')) {
    return cleaned;
  }
  return cleaned;
}

export function buildWhatsAppInquiryUrl(
  productName: string,
  productUrl: string,
  whatsappNumber: string,
): string {
  const phone = normalizePhone(whatsappNumber);
  const message = `Hi! I'm interested in *${productName}*.\n\n${productUrl}\n\nCould you tell me more about it?`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

export function buildWhatsAppOrderUrl(
  items: CartItem[],
  subtotal: number,
  shippingCost: number,
  whatsappNumber: string,
  orderNumber?: string,
): string {
  const phone = normalizePhone(whatsappNumber);

  const itemLines = items.map((item) => {
    const variant = item.variantName ? ` (${item.variantName})` : '';
    return `- ${item.name}${variant} x${item.quantity} — ${formatNaira(item.price * item.quantity)}`;
  });

  const total = subtotal + shippingCost;

  const messageParts = [
    `Hello! I'd like to place an order${orderNumber ? ` (${orderNumber})` : ''}:\n`,
    ...itemLines,
    '',
    `Subtotal: ${formatNaira(subtotal)}`,
    `Shipping: ${formatNaira(shippingCost)}`,
    `*Total: ${formatNaira(total)}*`,
    '',
    'Please confirm availability and payment options. Thank you!',
  ];

  const message = messageParts.join('\n');

  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

export function buildWhatsAppGreetingUrl(whatsappNumber: string): string {
  const phone = normalizePhone(whatsappNumber);
  const message = "Hi! I'd like to know more about your hair products.";
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

export function buildWhatsAppCustomerMessageUrl(
  customerPhone: string,
  orderNumber: string,
): string {
  const phone = normalizePhone(customerPhone);
  const message = `Hi! This is Emmanuel Sarah Hair regarding your order *${orderNumber}*. `;
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

export function buildWhatsAppDirectUrl(whatsappNumber: string): string {
  return `https://wa.me/${normalizePhone(whatsappNumber)}`;
}
