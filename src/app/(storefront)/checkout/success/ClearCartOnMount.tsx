'use client';

import { useEffect } from 'react';
import { useCartStore } from '@/stores/cart-store';

interface ClearCartOnMountProps {
  /**
   * The order's access token — used as a sessionStorage key so we only
   * clear the cart on the FIRST visit to the success page for this
   * specific order. Without this guard, a customer who bookmarks the
   * success URL (or refreshes it) has their in-progress new cart
   * silently wiped on every visit.
   */
  token: string;
}

const CLEARED_PREFIX = 'esh:success-cleared:';

export function ClearCartOnMount({ token }: ClearCartOnMountProps) {
  const clearCart = useCartStore((s) => s.clearCart);

  useEffect(() => {
    if (!token) return;
    // sessionStorage scoped per-tab: a new tab after payment still
    // triggers the clear (which we want, because the new tab probably
    // inherited persisted cart state). A refresh within the same tab
    // is a no-op after the first clear.
    const key = `${CLEARED_PREFIX}${token}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, '1');
    } catch {
      // sessionStorage can throw in privacy modes / full quota. Fall
      // through to clear anyway — a double-clear is harmless compared
      // to leaving a paid-for cart sitting around.
    }
    clearCart();
  }, [clearCart, token]);

  return null;
}
