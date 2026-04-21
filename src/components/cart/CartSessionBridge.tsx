'use client';

import { useEffect } from 'react';
import { useCartStore } from '@/stores/cart-store';

interface CartSessionBridgeProps {
  /** Supabase user id from the server session, or null if signed out. */
  userId: string | null;
}

/**
 * Invisible client component that keeps the cart store in sync with
 * the server-side session.
 *
 * Rendered once inside the storefront layout (server component) which
 * passes down the resolved userId. On mount — and whenever userId
 * changes — it calls `bindToUser`, which wipes the cart if the user
 * has changed (new sign-in, sign-out, or different account on a
 * shared device).
 *
 * Renders nothing — it is purely a side-effect bridge.
 */
export function CartSessionBridge({ userId }: CartSessionBridgeProps) {
  const bindToUser = useCartStore((state) => state.bindToUser);

  useEffect(() => {
    bindToUser(userId);
  }, [userId, bindToUser]);

  return null;
}
