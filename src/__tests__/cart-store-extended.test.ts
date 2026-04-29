import { describe, it, expect, beforeEach } from 'vitest';
import { useCartStore } from '@/stores/cart-store';
import type { CartItem } from '@/types/cart';

const makeItem = (overrides: Partial<CartItem> = {}): CartItem => ({
  productId: 'p1',
  variantId: null,
  name: 'Test Bundle',
  variantName: null,
  price: 25000,
  quantity: 1,
  image: '/test.jpg',
  slug: 'test-bundle',
  maxStock: 10,
  ...overrides,
});

describe('cart-store - extended scenarios', () => {
  beforeEach(() => {
    useCartStore.setState({ items: [] });
  });

  describe('complex multi-item cart', () => {
    it('handles adding multiple different products', () => {
      useCartStore
        .getState()
        .addItem(makeItem({ productId: 'p1', name: 'Bundle A' }));
      useCartStore
        .getState()
        .addItem(makeItem({ productId: 'p2', name: 'Bundle B' }));
      useCartStore
        .getState()
        .addItem(makeItem({ productId: 'p3', name: 'Closure' }));
      expect(useCartStore.getState().items).toHaveLength(3);
    });

    it('correctly calculates subtotal with mixed prices', () => {
      useCartStore
        .getState()
        .addItem(makeItem({ productId: 'p1', price: 25000, quantity: 2 }));
      useCartStore
        .getState()
        .addItem(makeItem({ productId: 'p2', price: 35000, quantity: 1 }));
      useCartStore
        .getState()
        .addItem(makeItem({ productId: 'p3', price: 15000, quantity: 3 }));
      // 25000*2 + 35000*1 + 15000*3 = 50000 + 35000 + 45000 = 130000
      expect(
        useCartStore
          .getState()
          .items.reduce((sum, i) => sum + i.price * i.quantity, 0),
      ).toBe(130000);
    });

    it('correctly counts total items across products', () => {
      useCartStore
        .getState()
        .addItem(makeItem({ productId: 'p1', quantity: 2 }));
      useCartStore
        .getState()
        .addItem(makeItem({ productId: 'p2', quantity: 3 }));
      useCartStore
        .getState()
        .addItem(makeItem({ productId: 'p3', quantity: 1 }));
      expect(
        useCartStore.getState().items.reduce((sum, i) => sum + i.quantity, 0),
      ).toBe(6);
    });
  });

  describe('variant handling', () => {
    it('same product with null variant and specific variant are separate', () => {
      useCartStore
        .getState()
        .addItem(makeItem({ productId: 'p1', variantId: null }));
      useCartStore
        .getState()
        .addItem(makeItem({ productId: 'p1', variantId: 'v1' }));
      expect(useCartStore.getState().items).toHaveLength(2);
    });

    it('removes correct variant of a product', () => {
      useCartStore
        .getState()
        .addItem(
          makeItem({ productId: 'p1', variantId: 'v1', variantName: '14"' }),
        );
      useCartStore
        .getState()
        .addItem(
          makeItem({ productId: 'p1', variantId: 'v2', variantName: '18"' }),
        );
      useCartStore.getState().removeItem('p1', 'v1');
      expect(useCartStore.getState().items).toHaveLength(1);
      expect(useCartStore.getState().items[0]!.variantId).toBe('v2');
    });

    it('updates quantity for correct variant', () => {
      useCartStore.getState().addItem(
        makeItem({
          productId: 'p1',
          variantId: 'v1',
          quantity: 1,
          maxStock: 10,
        }),
      );
      useCartStore.getState().addItem(
        makeItem({
          productId: 'p1',
          variantId: 'v2',
          quantity: 1,
          maxStock: 10,
        }),
      );
      useCartStore.getState().updateQuantity('p1', 'v1', 5);
      const items = useCartStore.getState().items;
      const v1 = items.find((i) => i.variantId === 'v1');
      const v2 = items.find((i) => i.variantId === 'v2');
      expect(v1?.quantity).toBe(5);
      expect(v2?.quantity).toBe(1);
    });
  });

  describe('edge cases', () => {
    it('adding item with quantity 0 still adds item', () => {
      useCartStore.getState().addItem(makeItem({ quantity: 0 }));
      expect(useCartStore.getState().items).toHaveLength(1);
      expect(useCartStore.getState().items[0]!.quantity).toBe(0);
    });

    it('subtotal of empty cart is 0', () => {
      expect(
        useCartStore
          .getState()
          .items.reduce((sum, i) => sum + i.price * i.quantity, 0),
      ).toBe(0);
    });

    it('totalItems of empty cart is 0', () => {
      expect(
        useCartStore.getState().items.reduce((sum, i) => sum + i.quantity, 0),
      ).toBe(0);
    });

    it('clearCart on already empty cart is safe', () => {
      useCartStore.getState().clearCart();
      expect(useCartStore.getState().items).toHaveLength(0);
    });

    it('removeItem on empty cart is safe', () => {
      useCartStore.getState().removeItem('nonexistent', null);
      expect(useCartStore.getState().items).toHaveLength(0);
    });

    it('updateQuantity on non-existent item is safe', () => {
      useCartStore.getState().addItem(makeItem({ productId: 'p1' }));
      useCartStore.getState().updateQuantity('nonexistent', null, 5);
      // Original item should be unchanged
      expect(useCartStore.getState().items).toHaveLength(1);
      expect(useCartStore.getState().items[0]!.quantity).toBe(1);
    });

    it('handles high-value items without overflow', () => {
      useCartStore
        .getState()
        .addItem(makeItem({ price: 999999999, quantity: 1 }));
      expect(
        useCartStore
          .getState()
          .items.reduce((sum, i) => sum + i.price * i.quantity, 0),
      ).toBe(999999999);
    });

    it('maxStock of 1 prevents adding more than 1', () => {
      useCartStore.getState().addItem(makeItem({ quantity: 1, maxStock: 1 }));
      useCartStore.getState().addItem(makeItem({ quantity: 1, maxStock: 1 }));
      expect(useCartStore.getState().items[0]!.quantity).toBe(1);
    });
  });
});
