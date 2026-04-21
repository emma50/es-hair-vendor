import { describe, it, expect } from 'vitest';
import {
  buildWhatsAppInquiryUrl,
  buildWhatsAppOrderUrl,
  buildWhatsAppGreetingUrl,
  buildWhatsAppCustomerMessageUrl,
  buildWhatsAppDirectUrl,
  normalizePhone,
} from '@/lib/whatsapp';
import type { CartItem } from '@/types/cart';

const makeCartItem = (overrides: Partial<CartItem> = {}): CartItem => ({
  productId: 'p1',
  variantId: null,
  name: 'Brazilian Bundle',
  variantName: null,
  price: 25000,
  quantity: 2,
  image: '/test.jpg',
  slug: 'brazilian-bundle',
  maxStock: 10,
  ...overrides,
});

describe('buildWhatsAppInquiryUrl', () => {
  it('returns a wa.me URL', () => {
    const url = buildWhatsAppInquiryUrl(
      'Test Hair',
      'https://eshair.com/products/test',
      '08012345678',
    );
    expect(url).toMatch(/^https:\/\/wa\.me\/23480/);
  });

  it('includes the product name in the message', () => {
    const url = buildWhatsAppInquiryUrl(
      'Silk Closure',
      'https://eshair.com/products/silk',
      '08012345678',
    );
    expect(decodeURIComponent(url)).toContain('Silk Closure');
  });

  it('normalizes phone with leading 0', () => {
    const url = buildWhatsAppInquiryUrl(
      'Test',
      'https://eshair.com',
      '08012345678',
    );
    expect(url).toContain('wa.me/2348012345678');
  });

  it('handles phone already starting with 234', () => {
    const url = buildWhatsAppInquiryUrl(
      'Test',
      'https://eshair.com',
      '2348012345678',
    );
    expect(url).toContain('wa.me/2348012345678');
  });
});

describe('buildWhatsAppOrderUrl', () => {
  it('includes item names in the message', () => {
    const items = [
      makeCartItem({ name: 'Bundle A' }),
      makeCartItem({ name: 'Bundle B' }),
    ];
    const url = buildWhatsAppOrderUrl(items, 50000, 3000, '08012345678');
    const decoded = decodeURIComponent(url);
    expect(decoded).toContain('Bundle A');
    expect(decoded).toContain('Bundle B');
  });

  it('includes subtotal, shipping, and total', () => {
    const items = [makeCartItem()];
    const url = buildWhatsAppOrderUrl(items, 50000, 3000, '08012345678');
    const decoded = decodeURIComponent(url);
    expect(decoded).toContain('Subtotal');
    expect(decoded).toContain('Shipping');
    expect(decoded).toContain('Total');
  });

  it('includes variant name when present', () => {
    const items = [makeCartItem({ variantName: '18 inches' })];
    const url = buildWhatsAppOrderUrl(items, 25000, 2000, '08012345678');
    expect(decodeURIComponent(url)).toContain('18 inches');
  });
});

describe('buildWhatsAppGreetingUrl', () => {
  it('returns a valid wa.me URL', () => {
    const url = buildWhatsAppGreetingUrl('08012345678');
    expect(url).toMatch(/^https:\/\/wa\.me\/2348012345678/);
  });
});

describe('buildWhatsAppCustomerMessageUrl', () => {
  it('includes the order number', () => {
    const url = buildWhatsAppCustomerMessageUrl(
      '08012345678',
      'ESH-20250315-0001',
    );
    expect(decodeURIComponent(url)).toContain('ESH-20250315-0001');
  });
});

describe('buildWhatsAppDirectUrl', () => {
  it('returns a plain wa.me URL without message', () => {
    const url = buildWhatsAppDirectUrl('08012345678');
    expect(url).toBe('https://wa.me/2348012345678');
    expect(url).not.toContain('?text=');
  });

  it('normalizes phone starting with 234', () => {
    const url = buildWhatsAppDirectUrl('2348099999999');
    expect(url).toBe('https://wa.me/2348099999999');
  });
});

describe('normalizePhone', () => {
  it('converts 0-prefixed to 234-prefixed', () => {
    expect(normalizePhone('08012345678')).toBe('2348012345678');
  });

  it('keeps 234-prefixed as-is', () => {
    expect(normalizePhone('2348012345678')).toBe('2348012345678');
  });

  it('strips non-digit characters', () => {
    expect(normalizePhone('+234-801-234-5678')).toBe('2348012345678');
  });
});
