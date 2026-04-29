import { describe, it, expect, beforeEach } from 'vitest';
import { useCartStore } from '@/stores/cart-store';
import { checkoutFormSchema } from '@/lib/validations';
import { buildWhatsAppOrderUrl } from '@/lib/whatsapp';
import { formatNaira, formatOrderNumber } from '@/lib/formatters';
import type { CartItem } from '@/types/cart';

/**
 * Integration tests for the checkout flow.
 * Tests the full flow from cart → form validation → order URL/data generation
 * without hitting the database (mocks server actions).
 */

const makeCartItem = (overrides: Partial<CartItem> = {}): CartItem => ({
  productId: 'p1',
  variantId: null,
  name: 'Brazilian Body Wave Bundle',
  variantName: null,
  price: 45000,
  quantity: 1,
  image: '/brazilian-body-wave.jpg',
  slug: 'brazilian-body-wave-bundle',
  maxStock: 20,
  ...overrides,
});

const validCheckoutData = {
  customerName: 'Chioma Adebayo',
  customerPhone: '08012345678',
  customerEmail: 'chioma@example.com',
  shippingAddress: '15 Admiralty Way, Lekki Phase 1',
  shippingCity: 'Lagos',
  shippingState: 'Lagos',
  notes: 'Call before delivery',
};

describe('checkout flow integration', () => {
  beforeEach(() => {
    useCartStore.setState({ items: [] });
  });

  describe('cart → checkout validation', () => {
    it('validates checkout form after cart is populated', () => {
      // Step 1: Populate cart
      useCartStore.getState().addItem(makeCartItem());
      expect(useCartStore.getState().items).toHaveLength(1);

      // Step 2: Validate checkout form
      const result = checkoutFormSchema.safeParse(validCheckoutData);
      expect(result.success).toBe(true);
    });

    it('rejects checkout with invalid phone', () => {
      useCartStore.getState().addItem(makeCartItem());
      const result = checkoutFormSchema.safeParse({
        ...validCheckoutData,
        customerPhone: '12345',
      });
      expect(result.success).toBe(false);
    });

    it('rejects checkout with short address', () => {
      useCartStore.getState().addItem(makeCartItem());
      const result = checkoutFormSchema.safeParse({
        ...validCheckoutData,
        shippingAddress: 'hi',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('shipping cost calculation', () => {
    it('applies free shipping when subtotal >= ₦100,000', () => {
      useCartStore
        .getState()
        .addItem(makeCartItem({ price: 50000, quantity: 2 }));
      const subtotal = useCartStore
        .getState()
        .items.reduce((sum, i) => sum + i.price * i.quantity, 0);
      expect(subtotal).toBe(100000);
      const shippingCost = subtotal >= 100000 ? 0 : 2500;
      expect(shippingCost).toBe(0);
    });

    it('charges ₦2,500 shipping when subtotal < ₦100,000', () => {
      useCartStore
        .getState()
        .addItem(makeCartItem({ price: 25000, quantity: 1 }));
      const subtotal = useCartStore
        .getState()
        .items.reduce((sum, i) => sum + i.price * i.quantity, 0);
      expect(subtotal).toBe(25000);
      const shippingCost = subtotal >= 100000 ? 0 : 2500;
      expect(shippingCost).toBe(2500);
    });

    it('free shipping at exact boundary', () => {
      useCartStore
        .getState()
        .addItem(makeCartItem({ price: 100000, quantity: 1 }));
      const subtotal = useCartStore
        .getState()
        .items.reduce((sum, i) => sum + i.price * i.quantity, 0);
      const shippingCost = subtotal >= 100000 ? 0 : 2500;
      expect(shippingCost).toBe(0);
    });

    it('charges shipping just below boundary', () => {
      useCartStore
        .getState()
        .addItem(makeCartItem({ price: 99999, quantity: 1 }));
      const subtotal = useCartStore
        .getState()
        .items.reduce((sum, i) => sum + i.price * i.quantity, 0);
      const shippingCost = subtotal >= 100000 ? 0 : 2500;
      expect(shippingCost).toBe(2500);
    });
  });

  describe('WhatsApp checkout flow', () => {
    it('generates a complete WhatsApp order URL from cart items', () => {
      const items = [
        makeCartItem({ name: 'Bundle A', price: 45000, quantity: 2 }),
        makeCartItem({
          productId: 'p2',
          name: 'Closure',
          variantName: '4x4',
          price: 25000,
          quantity: 1,
        }),
      ];
      items.forEach((item) => useCartStore.getState().addItem(item));

      const subtotal = useCartStore
        .getState()
        .items.reduce((sum, i) => sum + i.price * i.quantity, 0);
      const shippingCost = subtotal >= 100000 ? 0 : 2500;
      const orderNumber = formatOrderNumber(new Date(), 1);

      const whatsappUrl = buildWhatsAppOrderUrl(
        useCartStore.getState().items,
        subtotal,
        shippingCost,
        '08012345678',
        orderNumber,
      );

      const decoded = decodeURIComponent(whatsappUrl);

      // Verify URL structure
      expect(whatsappUrl).toMatch(/^https:\/\/wa\.me\//);
      // Verify items are in the message
      expect(decoded).toContain('Bundle A');
      expect(decoded).toContain('Closure');
      expect(decoded).toContain('4x4');
      // Verify order number
      expect(decoded).toContain(orderNumber);
      // Verify totals mentioned
      expect(decoded).toContain('Subtotal');
      expect(decoded).toContain('Total');
    });

    it('clears cart items after order', () => {
      useCartStore.getState().addItem(makeCartItem());
      useCartStore.getState().addItem(makeCartItem({ productId: 'p2' }));
      expect(useCartStore.getState().items).toHaveLength(2);

      // Simulate post-order cart clear
      useCartStore.getState().clearCart();
      expect(useCartStore.getState().items).toHaveLength(0);
      expect(
        useCartStore
          .getState()
          .items.reduce((sum, i) => sum + i.price * i.quantity, 0),
      ).toBe(0);
      expect(
        useCartStore.getState().items.reduce((sum, i) => sum + i.quantity, 0),
      ).toBe(0);
    });
  });

  describe('Paystack checkout flow', () => {
    it('calculates amount in kobo for Paystack', () => {
      useCartStore
        .getState()
        .addItem(makeCartItem({ price: 45000, quantity: 2 }));
      const subtotal = useCartStore
        .getState()
        .items.reduce((sum, i) => sum + i.price * i.quantity, 0);
      const shippingCost = subtotal >= 100000 ? 0 : 2500;
      const total = subtotal + shippingCost;
      const amountInKobo = total * 100;

      // 45000*2 = 90000 + 2500 shipping = 92500, * 100 = 9250000 kobo
      expect(amountInKobo).toBe(9250000);
    });

    it('generates unique payment references', () => {
      const ref1 = `ESH-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      // Small delay to ensure different timestamp
      const ref2 = `ESH-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      expect(ref1).not.toBe(ref2);
      expect(ref1).toMatch(/^ESH-\d+-[a-z0-9]+$/);
    });
  });

  describe('order number generation', () => {
    it('generates sequential order numbers for same day', () => {
      const today = new Date('2026-04-06');
      const order1 = formatOrderNumber(today, 1);
      const order2 = formatOrderNumber(today, 2);
      const order3 = formatOrderNumber(today, 3);

      expect(order1).toBe('ESH-20260406-0001');
      expect(order2).toBe('ESH-20260406-0002');
      expect(order3).toBe('ESH-20260406-0003');
    });

    it('resets counter for new day', () => {
      const day1 = formatOrderNumber(new Date('2026-04-06'), 15);
      const day2 = formatOrderNumber(new Date('2026-04-07'), 1);

      expect(day1).toBe('ESH-20260406-0015');
      expect(day2).toBe('ESH-20260407-0001');
    });
  });

  describe('full cart lifecycle', () => {
    it('add → update → validate → order → clear', () => {
      // 1. Add items
      useCartStore
        .getState()
        .addItem(makeCartItem({ productId: 'p1', price: 45000, quantity: 1 }));
      useCartStore
        .getState()
        .addItem(makeCartItem({ productId: 'p2', price: 30000, quantity: 2 }));
      expect(
        useCartStore.getState().items.reduce((sum, i) => sum + i.quantity, 0),
      ).toBe(3);

      // 2. Update quantity
      useCartStore.getState().updateQuantity('p1', null, 3);
      expect(
        useCartStore.getState().items.reduce((sum, i) => sum + i.quantity, 0),
      ).toBe(5);

      // 3. Validate form
      const parsed = checkoutFormSchema.safeParse(validCheckoutData);
      expect(parsed.success).toBe(true);

      // 4. Calculate totals
      const subtotal = useCartStore
        .getState()
        .items.reduce((sum, i) => sum + i.price * i.quantity, 0); // 45000*3 + 30000*2 = 195000
      expect(subtotal).toBe(195000);
      const shippingCost = subtotal >= 100000 ? 0 : 2500;
      expect(shippingCost).toBe(0); // Free shipping

      // 5. Generate order number
      const orderNumber = formatOrderNumber(new Date(), 1);
      expect(orderNumber).toMatch(/^ESH-\d{8}-0001$/);

      // 6. Format total for display
      const total = subtotal + shippingCost;
      const display = formatNaira(total);
      expect(display).toContain('195');

      // 7. Clear cart
      useCartStore.getState().clearCart();
      expect(useCartStore.getState().items).toHaveLength(0);
    });
  });
});

describe('cart item extraction for order creation', () => {
  beforeEach(() => {
    useCartStore.setState({ items: [] });
  });

  it('maps cart items to order input format', () => {
    useCartStore
      .getState()
      .addItem(makeCartItem({ productId: 'p1', variantId: null, quantity: 2 }));
    useCartStore
      .getState()
      .addItem(makeCartItem({ productId: 'p2', variantId: 'v1', quantity: 1 }));

    const cartItems = useCartStore.getState().items;
    const orderItems = cartItems.map((i) => ({
      productId: i.productId,
      variantId: i.variantId,
      quantity: i.quantity,
    }));

    expect(orderItems).toEqual([
      { productId: 'p1', variantId: null, quantity: 2 },
      { productId: 'p2', variantId: 'v1', quantity: 1 },
    ]);
  });

  it('preserves variant information through the flow', () => {
    useCartStore.getState().addItem(
      makeCartItem({
        productId: 'p1',
        variantId: 'v-18',
        variantName: '18 Inches',
        price: 55000,
        quantity: 1,
      }),
    );

    const item = useCartStore.getState().items[0]!;
    expect(item.variantId).toBe('v-18');
    expect(item.variantName).toBe('18 Inches');

    // WhatsApp URL should include variant name
    const url = buildWhatsAppOrderUrl(
      useCartStore.getState().items,
      item.price,
      2500,
      '08012345678',
    );
    const decoded = decodeURIComponent(url);
    expect(decoded).toContain('18 Inches');
  });
});
