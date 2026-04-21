import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartItem } from '@/types/cart';

// -------------------------------------------------------------------
// Cart Store — Zustand + localStorage (eshair-cart-v1)
//
// The cart is scoped per authenticated user. When `bindToUser` is
// called (via CartSessionBridge in the layout) with a new userId, the
// cart clears itself — preventing user A's cart from leaking to user
// B on a shared device, or persisting after sign-out.
// -------------------------------------------------------------------

const CART_VERSION = 1;

interface CartState {
  _version: number;
  /** Supabase user id of whoever owns this cart, or null if no one. */
  userId: string | null;
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (productId: string, variantId: string | null) => void;
  updateQuantity: (
    productId: string,
    variantId: string | null,
    quantity: number,
  ) => void;
  clearCart: () => void;
  /**
   * Called once on mount (via CartSessionBridge) with the current
   * session's user id (or null if signed out). If the id differs from
   * what's stored, the cart is wiped so stale items never surface.
   */
  bindToUser: (userId: string | null) => void;
  /**
   * Apply a server-side revalidation result to the cart in a single
   * batched update. Drops unavailable lines, clamps quantities to the
   * new `maxStock`, and writes through the authoritative live price.
   * See `@/app/actions/cart#validateCart` for the data source.
   */
  applyValidation: (
    lines: Array<{
      productId: string;
      variantId: string | null;
      available: boolean;
      currentPrice: number | null;
      maxStock: number;
    }>,
  ) => void;
}

function isValidCartItem(item: unknown): item is CartItem {
  if (!item || typeof item !== 'object') return false;
  const i = item as Record<string, unknown>;
  return (
    typeof i.productId === 'string' &&
    i.productId.length > 0 &&
    (i.variantId === null || typeof i.variantId === 'string') &&
    typeof i.name === 'string' &&
    typeof i.price === 'number' &&
    i.price >= 0 &&
    typeof i.quantity === 'number' &&
    i.quantity > 0 &&
    typeof i.image === 'string' &&
    typeof i.slug === 'string' &&
    typeof i.maxStock === 'number' &&
    i.maxStock > 0
  );
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      _version: CART_VERSION,
      userId: null,
      items: [],

      addItem: (item) => {
        set((state) => {
          const existing = state.items.find(
            (i) =>
              i.productId === item.productId && i.variantId === item.variantId,
          );
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.productId === item.productId && i.variantId === item.variantId
                  ? {
                      ...i,
                      quantity: Math.min(
                        i.quantity + item.quantity,
                        item.maxStock,
                      ),
                    }
                  : i,
              ),
            };
          }
          return { items: [...state.items, item] };
        });
      },

      removeItem: (productId, variantId) => {
        set((state) => ({
          items: state.items.filter(
            (i) => !(i.productId === productId && i.variantId === variantId),
          ),
        }));
      },

      updateQuantity: (productId, variantId, quantity) => {
        set((state) => {
          if (quantity <= 0) {
            return {
              items: state.items.filter(
                (i) =>
                  !(i.productId === productId && i.variantId === variantId),
              ),
            };
          }
          return {
            items: state.items.map((i) =>
              i.productId === productId && i.variantId === variantId
                ? { ...i, quantity: Math.min(quantity, i.maxStock) }
                : i,
            ),
          };
        });
      },

      clearCart: () => set({ items: [] }),

      bindToUser: (newUserId) => {
        set((state) => {
          // Same user — nothing to do.
          if (state.userId === newUserId) return {};
          // User changed (new sign-in, sign-out, or different account) —
          // wipe items so stale data never surfaces.
          return { userId: newUserId, items: [] };
        });
      },

      applyValidation: (lines) => {
        // Index the server report so we can look each cart line up in
        // O(1). `productId|variantId` uniquely identifies a cart row.
        const key = (pid: string, vid: string | null) => `${pid}|${vid ?? ''}`;
        const byKey = new Map(
          lines.map((l) => [key(l.productId, l.variantId), l]),
        );

        set((state) => {
          const next: CartItem[] = [];
          for (const item of state.items) {
            const report = byKey.get(key(item.productId, item.variantId));
            // Missing from the report (e.g. network blip on partial
            // batch) — keep the item unchanged rather than discarding.
            if (!report) {
              next.push(item);
              continue;
            }
            // Unavailable → drop the line entirely.
            if (!report.available) continue;
            next.push({
              ...item,
              // Authoritative live price (may differ from snapshot).
              price: report.currentPrice ?? item.price,
              // Clamp to current stock; keep quantity otherwise.
              maxStock: report.maxStock,
              quantity: Math.min(item.quantity, report.maxStock),
            });
          }
          return { items: next };
        });
      },
    }),
    {
      name: 'eshair-cart-v1',
      version: CART_VERSION,

      onRehydrateStorage: () => (state) => {
        if (!state) return;
        // Filter out corrupted items that may have been written by an
        // older version of the schema.
        const validItems = state.items.filter(isValidCartItem);
        if (validItems.length !== state.items.length) {
          state.items = validItems;
        }
      },

      migrate: (persisted, version) => {
        const state = persisted as CartState;
        if (version === 0) {
          return { ...state, _version: CART_VERSION, userId: null };
        }
        return state;
      },
    },
  ),
);

// -------------------------------------------------------------------
// Derived selectors — stable references, prevent unnecessary re-renders
// -------------------------------------------------------------------

export function useCartTotalItems(): number {
  return useCartStore((state) =>
    state.items.reduce((sum, i) => sum + i.quantity, 0),
  );
}

export function useCartSubtotal(): number {
  return useCartStore((state) =>
    state.items.reduce((sum, i) => sum + i.price * i.quantity, 0),
  );
}

export function useCartItemCount(): number {
  return useCartStore((state) => state.items.length);
}

export { isValidCartItem };
