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

describe('cart-store', () => {
  beforeEach(() => {
    useCartStore.setState({ items: [], userId: null });
  });

  describe('addItem', () => {
    it('adds a new item to empty cart', () => {
      useCartStore.getState().addItem(makeItem());
      expect(useCartStore.getState().items).toHaveLength(1);
      expect(useCartStore.getState().items[0]!.name).toBe('Test Bundle');
    });

    it('increments quantity for existing item', () => {
      useCartStore.getState().addItem(makeItem({ quantity: 2 }));
      useCartStore.getState().addItem(makeItem({ quantity: 3 }));
      expect(useCartStore.getState().items).toHaveLength(1);
      expect(useCartStore.getState().items[0]!.quantity).toBe(5);
    });

    it('caps quantity at maxStock', () => {
      useCartStore.getState().addItem(makeItem({ quantity: 7, maxStock: 10 }));
      useCartStore.getState().addItem(makeItem({ quantity: 7, maxStock: 10 }));
      expect(useCartStore.getState().items[0]!.quantity).toBe(10);
    });

    it('treats different variants as separate items', () => {
      useCartStore.getState().addItem(makeItem({ variantId: 'v1' }));
      useCartStore.getState().addItem(makeItem({ variantId: 'v2' }));
      expect(useCartStore.getState().items).toHaveLength(2);
    });
  });

  describe('removeItem', () => {
    it('removes the correct item', () => {
      useCartStore.getState().addItem(makeItem({ productId: 'p1' }));
      useCartStore.getState().addItem(makeItem({ productId: 'p2' }));
      useCartStore.getState().removeItem('p1', null);
      expect(useCartStore.getState().items).toHaveLength(1);
      expect(useCartStore.getState().items[0]!.productId).toBe('p2');
    });

    it('is a no-op for non-existent item', () => {
      useCartStore.getState().addItem(makeItem());
      useCartStore.getState().removeItem('nonexistent', null);
      expect(useCartStore.getState().items).toHaveLength(1);
    });
  });

  describe('updateQuantity', () => {
    it('updates to a valid quantity', () => {
      useCartStore.getState().addItem(makeItem());
      useCartStore.getState().updateQuantity('p1', null, 5);
      expect(useCartStore.getState().items[0]!.quantity).toBe(5);
    });

    it('removes item when quantity is 0', () => {
      useCartStore.getState().addItem(makeItem());
      useCartStore.getState().updateQuantity('p1', null, 0);
      expect(useCartStore.getState().items).toHaveLength(0);
    });

    it('removes item when quantity is negative', () => {
      useCartStore.getState().addItem(makeItem());
      useCartStore.getState().updateQuantity('p1', null, -1);
      expect(useCartStore.getState().items).toHaveLength(0);
    });

    it('caps at maxStock', () => {
      useCartStore.getState().addItem(makeItem({ maxStock: 5 }));
      useCartStore.getState().updateQuantity('p1', null, 99);
      expect(useCartStore.getState().items[0]!.quantity).toBe(5);
    });
  });

  describe('clearCart', () => {
    it('empties the cart', () => {
      useCartStore.getState().addItem(makeItem({ productId: 'p1' }));
      useCartStore.getState().addItem(makeItem({ productId: 'p2' }));
      useCartStore.getState().clearCart();
      expect(useCartStore.getState().items).toHaveLength(0);
    });
  });

  describe('bindToUser', () => {
    it('sets userId when binding for the first time (was null)', () => {
      useCartStore.setState({ userId: null, items: [] });
      useCartStore.getState().bindToUser('user-abc');
      expect(useCartStore.getState().userId).toBe('user-abc');
    });

    it('is a no-op when binding to the same user', () => {
      useCartStore.setState({ userId: 'user-abc', items: [makeItem()] });
      useCartStore.getState().bindToUser('user-abc');
      // Items must still be present — no wipe occurred.
      expect(useCartStore.getState().items).toHaveLength(1);
      expect(useCartStore.getState().userId).toBe('user-abc');
    });

    it('clears cart when a different user signs in', () => {
      useCartStore.setState({ userId: 'user-abc', items: [makeItem()] });
      useCartStore.getState().bindToUser('user-xyz');
      expect(useCartStore.getState().items).toHaveLength(0);
      expect(useCartStore.getState().userId).toBe('user-xyz');
    });

    it('clears cart on sign-out (userId becomes null)', () => {
      useCartStore.setState({ userId: 'user-abc', items: [makeItem()] });
      useCartStore.getState().bindToUser(null);
      expect(useCartStore.getState().items).toHaveLength(0);
      expect(useCartStore.getState().userId).toBeNull();
    });

    it('no-op when userId is already null and binding to null', () => {
      useCartStore.setState({ userId: null, items: [] });
      useCartStore.getState().bindToUser(null);
      expect(useCartStore.getState().userId).toBeNull();
      expect(useCartStore.getState().items).toHaveLength(0);
    });
  });

  describe('computed (derived from items)', () => {
    function totalItems() {
      return useCartStore
        .getState()
        .items.reduce((sum, i) => sum + i.quantity, 0);
    }
    function subtotal() {
      return useCartStore
        .getState()
        .items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    }

    it('totalItems sums all quantities', () => {
      useCartStore
        .getState()
        .addItem(makeItem({ productId: 'p1', quantity: 2 }));
      useCartStore
        .getState()
        .addItem(makeItem({ productId: 'p2', quantity: 3 }));
      expect(totalItems()).toBe(5);
    });

    it('subtotal sums price * quantity', () => {
      useCartStore
        .getState()
        .addItem(makeItem({ productId: 'p1', price: 10000, quantity: 2 }));
      useCartStore
        .getState()
        .addItem(makeItem({ productId: 'p2', price: 5000, quantity: 3 }));
      expect(subtotal()).toBe(35000);
    });
  });
});
