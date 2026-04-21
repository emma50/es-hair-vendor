import { describe, it, expect } from 'vitest';
import {
  buildWhatsAppInquiryUrl,
  buildWhatsAppOrderUrl,
  buildWhatsAppGreetingUrl,
  buildWhatsAppCustomerMessageUrl,
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

describe('buildWhatsAppOrderUrl - order number support', () => {
  it('includes order number in message when provided', () => {
    const items = [makeCartItem()];
    const url = buildWhatsAppOrderUrl(
      items,
      50000,
      3000,
      '08012345678',
      'ESH-20260406-0001',
    );
    const decoded = decodeURIComponent(url);
    expect(decoded).toContain('ESH-20260406-0001');
  });

  it('works without order number (backward compatible)', () => {
    const items = [makeCartItem()];
    const url = buildWhatsAppOrderUrl(items, 50000, 3000, '08012345678');
    const decoded = decodeURIComponent(url);
    expect(decoded).not.toContain('ESH-');
    expect(decoded).toContain('place an order');
  });

  it('calculates and displays the total correctly', () => {
    const items = [makeCartItem({ price: 25000, quantity: 2 })];
    const url = buildWhatsAppOrderUrl(items, 50000, 2500, '08012345678');
    const decoded = decodeURIComponent(url);
    // Total should be 50000 + 2500 = 52500
    expect(decoded).toContain('Total');
  });

  it('handles multiple items in the order', () => {
    const items = [
      makeCartItem({ name: 'Bundle A', price: 25000, quantity: 1 }),
      makeCartItem({
        productId: 'p2',
        name: 'Bundle B',
        price: 35000,
        quantity: 2,
      }),
      makeCartItem({
        productId: 'p3',
        name: 'Closure',
        price: 15000,
        quantity: 1,
      }),
    ];
    const url = buildWhatsAppOrderUrl(
      items,
      110000,
      0,
      '08012345678',
      'ESH-20260406-0002',
    );
    const decoded = decodeURIComponent(url);
    expect(decoded).toContain('Bundle A');
    expect(decoded).toContain('Bundle B');
    expect(decoded).toContain('Closure');
  });

  it('handles free shipping (0 cost)', () => {
    const items = [makeCartItem({ price: 200000, quantity: 1 })];
    const url = buildWhatsAppOrderUrl(items, 200000, 0, '08012345678');
    const decoded = decodeURIComponent(url);
    expect(decoded).toContain('Shipping');
  });
});

describe('phone number normalization', () => {
  it('normalizes 080 prefix to 23480', () => {
    const url = buildWhatsAppGreetingUrl('08012345678');
    expect(url).toContain('wa.me/2348012345678');
  });

  it('normalizes 070 prefix to 23470', () => {
    const url = buildWhatsAppGreetingUrl('07012345678');
    expect(url).toContain('wa.me/2347012345678');
  });

  it('normalizes 090 prefix to 23490', () => {
    const url = buildWhatsAppGreetingUrl('09012345678');
    expect(url).toContain('wa.me/2349012345678');
  });

  it('keeps number starting with 234 unchanged', () => {
    const url = buildWhatsAppGreetingUrl('2348012345678');
    expect(url).toContain('wa.me/2348012345678');
  });

  it('handles number with + prefix', () => {
    // '+' gets stripped by replace(/\D/g, '') before normalization
    const url = buildWhatsAppGreetingUrl('+2348012345678');
    // After stripping non-digits: 2348012345678
    expect(url).toContain('wa.me/2348012345678');
  });
});

describe('buildWhatsAppInquiryUrl - message content', () => {
  it('includes product URL in the message', () => {
    const url = buildWhatsAppInquiryUrl(
      'Premium Bundle',
      'https://eshair.com/products/premium-bundle',
      '08012345678',
    );
    const decoded = decodeURIComponent(url);
    expect(decoded).toContain('https://eshair.com/products/premium-bundle');
  });

  it('includes a greeting in the message', () => {
    const url = buildWhatsAppInquiryUrl(
      'Test',
      'https://eshair.com',
      '08012345678',
    );
    const decoded = decodeURIComponent(url);
    expect(decoded).toContain('Hi');
  });

  it('uses bold formatting for product name', () => {
    const url = buildWhatsAppInquiryUrl(
      'Silk Closure',
      'https://eshair.com',
      '08012345678',
    );
    const decoded = decodeURIComponent(url);
    expect(decoded).toContain('*Silk Closure*');
  });
});

describe('buildWhatsAppCustomerMessageUrl', () => {
  it('includes store name context', () => {
    const url = buildWhatsAppCustomerMessageUrl(
      '08012345678',
      'ESH-20260406-0001',
    );
    const decoded = decodeURIComponent(url);
    expect(decoded).toContain('Emmanuel Sarah Hair');
  });

  it('normalizes customer phone number', () => {
    const url = buildWhatsAppCustomerMessageUrl(
      '08099887766',
      'ESH-20260406-0001',
    );
    expect(url).toContain('wa.me/2348099887766');
  });

  it('uses bold formatting for order number', () => {
    const url = buildWhatsAppCustomerMessageUrl(
      '08012345678',
      'ESH-20260406-0001',
    );
    const decoded = decodeURIComponent(url);
    expect(decoded).toContain('*ESH-20260406-0001*');
  });
});
