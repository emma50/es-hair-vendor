'use client';

import { useEffect, useRef } from 'react';
import { validateCart } from '@/app/actions/cart';
import { useCartStore } from '@/stores/cart-store';
import { useToast } from '@/components/ui/Toast';

/**
 * On-mount cart reconciliation for the /cart page.
 *
 * The cart is persisted in localStorage, which means a shopper's stored
 * snapshot can be days old by the time they reopen it — prices may
 * have been bumped, variants deleted, stock depleted. We fire one
 * `validateCart` server action after hydration to pull the current
 * ground-truth and apply it via `applyValidation` on the store.
 *
 * Side effects (all handled inside the store action):
 *   - Lines for deactivated products/variants are removed.
 *   - `quantity` is clamped down to the new `maxStock`.
 *   - `price` is overwritten with the live figure.
 *
 * We surface a one-shot toast when we had to change something, so the
 * customer isn't confused to see their cart subtly different.
 */
export function CartValidator() {
  const { toast } = useToast();
  const items = useCartStore((s) => s.items);
  const applyValidation = useCartStore((s) => s.applyValidation);
  const hasRunRef = useRef(false);

  useEffect(() => {
    // Run exactly once per mount. Re-running on every `items` change
    // would turn every edit into a server round-trip.
    if (hasRunRef.current) return;
    // Nothing to validate yet — wait for hydration/bootstrap.
    if (items.length === 0) return;
    hasRunRef.current = true;

    const snapshot = items.map((i) => ({
      productId: i.productId,
      variantId: i.variantId,
      quantity: i.quantity,
      price: i.price,
    }));

    (async () => {
      const result = await validateCart(snapshot);
      if (!result.success) return; // toast already surfaced by server

      const { lines } = result.data;
      const removed = lines.filter((l) => !l.available).length;
      const priceChanges = lines.filter(
        (l) => l.available && l.priceChanged,
      ).length;
      const stockClamps = lines.filter(
        (l) => l.available && l.stockShortfall,
      ).length;

      applyValidation(lines);

      // Show at most one combined toast — more detail than that
      // belongs on the line itself (future work), not in a toast.
      if (removed + priceChanges + stockClamps === 0) return;

      const messages: string[] = [];
      if (removed > 0) {
        messages.push(
          `${removed} item${removed === 1 ? '' : 's'} no longer available`,
        );
      }
      if (priceChanges > 0) {
        messages.push(
          `${priceChanges} price${priceChanges === 1 ? '' : 's'} updated`,
        );
      }
      if (stockClamps > 0) {
        messages.push(
          `${stockClamps} quantit${stockClamps === 1 ? 'y' : 'ies'} adjusted to available stock`,
        );
      }
      toast(`Cart refreshed: ${messages.join(', ')}.`, 'warning');
    })();
  }, [items, applyValidation, toast]);

  return null;
}
