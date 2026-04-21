'use client';

import { useEffect, useState } from 'react';
import {
  useCartStore,
  useCartTotalItems,
  useCartSubtotal,
} from '@/stores/cart-store';

/**
 * Cart hook — the ONLY way to access cart state in components.
 *
 * Handles SSR hydration mismatch: returns empty data during SSR,
 * then hydrates from localStorage on the client. Components that
 * use this hook will always see consistent data.
 *
 * Uses fine-grained Zustand selectors (useCartTotalItems, useCartSubtotal)
 * so components only re-render when their specific slice changes.
 */
export function useCart() {
  const [isHydrated, setIsHydrated] = useState(false);

  const items = useCartStore((state) => state.items);
  const addItem = useCartStore((state) => state.addItem);
  const removeItem = useCartStore((state) => state.removeItem);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const clearCart = useCartStore((state) => state.clearCart);
  const totalItems = useCartTotalItems();
  const subtotal = useCartSubtotal();

  useEffect(() => {
    // Zustand persist has finished rehydrating from localStorage
    // by the time this effect runs. Safe to expose data.
    setIsHydrated(true);
  }, []);

  return {
    items: isHydrated ? items : [],
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    totalItems: isHydrated ? totalItems : 0,
    subtotal: isHydrated ? subtotal : 0,
    isHydrated,
  };
}
