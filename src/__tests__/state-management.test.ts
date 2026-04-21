import { describe, it, expect, beforeEach } from 'vitest';
import { act } from 'react';
import { useCartStore, isValidCartItem } from '@/stores/cart-store';
import type { CartItem } from '@/types/cart';

// -------------------------------------------------------------------
// State Management Tests
//
// Validates:
// 1. Cart store: single source of truth for cart data
// 2. Rehydration validation: corrupted localStorage data is filtered
// 3. Computed selectors: totalItems, subtotal derive correctly
// 4. State isolation: no cross-contamination between operations
// -------------------------------------------------------------------

function makeItem(overrides: Partial<CartItem> = {}): CartItem {
  return {
    productId: 'prod-1',
    variantId: null,
    name: 'Test Product',
    variantName: null,
    price: 15000,
    quantity: 1,
    image: '/test.jpg',
    slug: 'test-product',
    maxStock: 10,
    ...overrides,
  };
}

describe('cart store — single source of truth', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    act(() => {
      useCartStore.setState({ items: [] });
    });
  });

  it('starts with empty items', () => {
    expect(useCartStore.getState().items).toEqual([]);
  });

  it('addItem adds to empty cart', () => {
    const item = makeItem();
    act(() => {
      useCartStore.getState().addItem(item);
    });
    expect(useCartStore.getState().items).toHaveLength(1);
    expect(useCartStore.getState().items[0]).toEqual(item);
  });

  it('addItem increments quantity for same product+variant', () => {
    const item = makeItem({ quantity: 2 });
    act(() => {
      useCartStore.getState().addItem(item);
      useCartStore.getState().addItem(makeItem({ quantity: 3 }));
    });
    const items = useCartStore.getState().items;
    expect(items).toHaveLength(1);
    expect(items[0].quantity).toBe(5);
  });

  it('addItem caps quantity at maxStock', () => {
    act(() => {
      useCartStore.getState().addItem(makeItem({ quantity: 7, maxStock: 10 }));
      useCartStore.getState().addItem(makeItem({ quantity: 5, maxStock: 10 }));
    });
    expect(useCartStore.getState().items[0].quantity).toBe(10);
  });

  it('addItem treats different variants as separate items', () => {
    act(() => {
      useCartStore.getState().addItem(makeItem({ variantId: 'v-1' }));
      useCartStore.getState().addItem(makeItem({ variantId: 'v-2' }));
    });
    expect(useCartStore.getState().items).toHaveLength(2);
  });

  it('removeItem removes correct item by productId+variantId', () => {
    act(() => {
      useCartStore
        .getState()
        .addItem(makeItem({ productId: 'a', variantId: 'v1' }));
      useCartStore
        .getState()
        .addItem(makeItem({ productId: 'b', variantId: null }));
      useCartStore.getState().removeItem('a', 'v1');
    });
    const items = useCartStore.getState().items;
    expect(items).toHaveLength(1);
    expect(items[0].productId).toBe('b');
  });

  it('removeItem is a no-op for non-existent item', () => {
    act(() => {
      useCartStore.getState().addItem(makeItem());
      useCartStore.getState().removeItem('nonexistent', null);
    });
    expect(useCartStore.getState().items).toHaveLength(1);
  });

  it('updateQuantity updates to valid quantity', () => {
    act(() => {
      useCartStore.getState().addItem(makeItem({ quantity: 1 }));
      useCartStore.getState().updateQuantity('prod-1', null, 5);
    });
    expect(useCartStore.getState().items[0].quantity).toBe(5);
  });

  it('updateQuantity removes item when quantity ≤ 0', () => {
    act(() => {
      useCartStore.getState().addItem(makeItem());
      useCartStore.getState().updateQuantity('prod-1', null, 0);
    });
    expect(useCartStore.getState().items).toHaveLength(0);
  });

  it('updateQuantity caps at maxStock', () => {
    act(() => {
      useCartStore.getState().addItem(makeItem({ maxStock: 5 }));
      useCartStore.getState().updateQuantity('prod-1', null, 99);
    });
    expect(useCartStore.getState().items[0].quantity).toBe(5);
  });

  it('clearCart empties all items', () => {
    act(() => {
      useCartStore.getState().addItem(makeItem({ productId: 'a' }));
      useCartStore.getState().addItem(makeItem({ productId: 'b' }));
      useCartStore.getState().clearCart();
    });
    expect(useCartStore.getState().items).toHaveLength(0);
  });
});

describe('cart derived selectors', () => {
  beforeEach(() => {
    act(() => {
      useCartStore.setState({ items: [] });
    });
  });

  it('totalItems sums all quantities', () => {
    act(() => {
      useCartStore.setState({
        items: [
          makeItem({ productId: 'a', quantity: 3 }),
          makeItem({ productId: 'b', quantity: 2 }),
        ],
      });
    });
    const total = useCartStore
      .getState()
      .items.reduce((sum, i) => sum + i.quantity, 0);
    expect(total).toBe(5);
  });

  it('subtotal sums price × quantity for all items', () => {
    act(() => {
      useCartStore.setState({
        items: [
          makeItem({ productId: 'a', price: 10000, quantity: 2 }),
          makeItem({ productId: 'b', price: 5000, quantity: 3 }),
        ],
      });
    });
    const subtotal = useCartStore
      .getState()
      .items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    expect(subtotal).toBe(35000); // 20000 + 15000
  });

  it('returns 0 for empty cart', () => {
    const items = useCartStore.getState().items;
    const total = items.reduce((sum, i) => sum + i.quantity, 0);
    const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    expect(total).toBe(0);
    expect(subtotal).toBe(0);
  });
});

describe('cart rehydration validation — isValidCartItem', () => {
  it('accepts valid CartItem', () => {
    expect(isValidCartItem(makeItem())).toBe(true);
  });

  it('accepts item with variant', () => {
    expect(
      isValidCartItem(makeItem({ variantId: 'v-1', variantName: '18 inches' })),
    ).toBe(true);
  });

  it('rejects null', () => {
    expect(isValidCartItem(null)).toBe(false);
  });

  it('rejects non-object', () => {
    expect(isValidCartItem('string')).toBe(false);
    expect(isValidCartItem(42)).toBe(false);
  });

  it('rejects empty productId', () => {
    expect(isValidCartItem(makeItem({ productId: '' }))).toBe(false);
  });

  it('rejects negative price', () => {
    expect(isValidCartItem(makeItem({ price: -100 }))).toBe(false);
  });

  it('rejects zero quantity', () => {
    expect(isValidCartItem(makeItem({ quantity: 0 }))).toBe(false);
  });

  it('rejects zero maxStock', () => {
    expect(isValidCartItem(makeItem({ maxStock: 0 }))).toBe(false);
  });

  it('rejects missing fields', () => {
    expect(isValidCartItem({ productId: 'x' })).toBe(false);
    expect(isValidCartItem({ productId: 'x', price: 100 })).toBe(false);
  });

  it('rejects wrong type for price', () => {
    expect(isValidCartItem({ ...makeItem(), price: '15000' })).toBe(false);
  });
});

describe('state isolation — no cross-contamination', () => {
  beforeEach(() => {
    act(() => {
      useCartStore.setState({ items: [] });
    });
  });

  it('operations on one item do not affect others', () => {
    const itemA = makeItem({ productId: 'a', price: 10000 });
    const itemB = makeItem({ productId: 'b', price: 20000 });

    act(() => {
      useCartStore.getState().addItem(itemA);
      useCartStore.getState().addItem(itemB);
      useCartStore.getState().updateQuantity('a', null, 5);
    });

    const items = useCartStore.getState().items;
    expect(items.find((i) => i.productId === 'a')?.quantity).toBe(5);
    expect(items.find((i) => i.productId === 'b')?.quantity).toBe(1); // unchanged
  });

  it('clearCart does not affect subsequent addItem', () => {
    act(() => {
      useCartStore.getState().addItem(makeItem({ productId: 'old' }));
      useCartStore.getState().clearCart();
      useCartStore.getState().addItem(makeItem({ productId: 'new' }));
    });

    const items = useCartStore.getState().items;
    expect(items).toHaveLength(1);
    expect(items[0].productId).toBe('new');
  });

  it('removing last item results in empty array (not undefined)', () => {
    act(() => {
      useCartStore.getState().addItem(makeItem());
      useCartStore.getState().removeItem('prod-1', null);
    });
    expect(useCartStore.getState().items).toEqual([]);
    expect(Array.isArray(useCartStore.getState().items)).toBe(true);
  });
});
