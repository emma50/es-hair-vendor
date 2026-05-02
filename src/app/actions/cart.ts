'use server';

import { prisma } from '@/lib/prisma';
import { logServerError } from '@/lib/log';
import { cartValidationItemsArraySchema } from '@/lib/validations';
import type { ActionResult } from '@/types';
import * as Sentry from '@sentry/nextjs';
import { headers } from 'next/headers';

interface CartValidationInput {
  productId: string;
  variantId: string | null;
  quantity: number;
  /** Price snapshot taken at add-to-cart time. */
  price: number;
}

export interface CartValidationLine {
  productId: string;
  variantId: string | null;
  /** `null` if the product/variant was deleted or deactivated. */
  available: boolean;
  /** Current live price — may differ from the cart snapshot. */
  currentPrice: number | null;
  /** Current stock; the client should clamp `quantity` to this value. */
  maxStock: number;
  /** `true` when live price doesn't match the cart's snapshot. */
  priceChanged: boolean;
  /** `true` when the cart's `quantity` exceeds current stock. */
  stockShortfall: boolean;
}

/**
 * Revalidate a cart against current product/variant prices and stock.
 *
 * Why this exists:
 * Carts are persisted in localStorage for days. By the time the
 * customer returns, the products they saved may have had price
 * updates, stock depletions, or full deactivations — and the
 * denormalised snapshot in Zustand is blissfully unaware. Without a
 * refresh, the first signal they get is a "Product not found" / "only
 * X in stock" error on the checkout button, which is a poor UX.
 *
 * This action returns a per-line report so the `/cart` page can:
 *   - Update `maxStock` and clamp `quantity` silently where safe.
 *   - Show a visible "price changed" badge when `currentPrice` differs.
 *   - Remove lines whose product/variant has been deactivated.
 *
 * Performance: one round-trip for products + one for variants. We do
 * NOT fetch anything else — no images, no descriptions — to keep this
 * hot path cheap.
 */
export async function validateCart(
  items: CartValidationInput[],
): Promise<ActionResult<{ lines: CartValidationLine[] }>> {
  return Sentry.withServerActionInstrumentation(
    'validateCart',
    { headers: await headers() },
    async (): Promise<ActionResult<{ lines: CartValidationLine[] }>> => {
      if (!Array.isArray(items) || items.length === 0) {
        return { success: true, data: { lines: [] } };
      }

      // Defensive validation. This endpoint reads the cart snapshot from
      // localStorage, which is user-controlled. Malformed items (NaN
      // quantities, non-CUID ids, negative prices, huge arrays) shouldn't
      // reach Prisma — the worst case is silent corruption of the ID
      // lookups. Reject the whole request rather than trying to filter,
      // since the client already handles a failed validate gracefully.
      const parsedItems = cartValidationItemsArraySchema.safeParse(items);
      if (!parsedItems.success) {
        return {
          success: false,
          error: 'Your cart has an invalid item. Please refresh and try again.',
        };
      }
      const safeItems = parsedItems.data;

      try {
        const productIds = [...new Set(safeItems.map((i) => i.productId))];
        const variantIds = safeItems
          .map((i) => i.variantId)
          .filter((v): v is string => typeof v === 'string' && v.length > 0);

        const [products, variants] = await Promise.all([
          prisma.product.findMany({
            where: { id: { in: productIds } },
            select: {
              id: true,
              basePrice: true,
              stockQuantity: true,
              isActive: true,
            },
          }),
          variantIds.length > 0
            ? prisma.productVariant.findMany({
                where: { id: { in: variantIds } },
                select: {
                  id: true,
                  price: true,
                  stockQuantity: true,
                  isActive: true,
                },
              })
            : Promise.resolve([]),
        ]);

        const productMap = new Map(products.map((p) => [p.id, p]));
        const variantMap = new Map(variants.map((v) => [v.id, v]));

        const lines: CartValidationLine[] = safeItems.map((item) => {
          // Variant-bearing line: variant is authoritative for price +
          // stock, but we still require the parent product to be active.
          if (item.variantId) {
            const variant = variantMap.get(item.variantId);
            const product = productMap.get(item.productId);
            const available =
              !!variant && variant.isActive && !!product && product.isActive;

            if (!available || !variant) {
              return {
                productId: item.productId,
                variantId: item.variantId,
                available: false,
                currentPrice: null,
                maxStock: 0,
                priceChanged: false,
                stockShortfall: item.quantity > 0,
              };
            }

            const currentPrice = Number(variant.price);
            return {
              productId: item.productId,
              variantId: item.variantId,
              available: true,
              currentPrice,
              maxStock: variant.stockQuantity,
              priceChanged: currentPrice !== item.price,
              stockShortfall: item.quantity > variant.stockQuantity,
            };
          }

          // Non-variant line: price + stock come from the product itself.
          const product = productMap.get(item.productId);
          const available = !!product && product.isActive;

          if (!available || !product) {
            return {
              productId: item.productId,
              variantId: null,
              available: false,
              currentPrice: null,
              maxStock: 0,
              priceChanged: false,
              stockShortfall: item.quantity > 0,
            };
          }

          const currentPrice = Number(product.basePrice);
          return {
            productId: item.productId,
            variantId: null,
            available: true,
            currentPrice,
            maxStock: product.stockQuantity,
            priceChanged: currentPrice !== item.price,
            stockShortfall: item.quantity > product.stockQuantity,
          };
        });

        return { success: true, data: { lines } };
      } catch (error) {
        logServerError('cart.validate', error);
        return {
          success: false,
          error: 'Could not refresh your cart. Please try again.',
        };
      }
    },
  );
}
