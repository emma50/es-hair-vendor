/**
 * RSC-boundary serialization helpers.
 *
 * Prisma returns `Decimal` instances for numeric columns mapped to
 * Postgres DECIMAL/NUMERIC. These cannot cross the React Server
 * Component → Client Component boundary — React's serializer only
 * accepts plain JSON-safe values and throws:
 *
 *   "Only plain objects can be passed to Client Components from Server
 *    Components. Decimal objects are not supported."
 *
 * Every server component that hands a Prisma row to a 'use client'
 * component must first convert Decimal columns to plain `number`.
 * These helpers centralise that conversion and export the matching
 * serialized types so client props stay type-safe.
 *
 * Rules of thumb:
 *   - NEVER pass raw Prisma rows with Decimal columns to client components
 *   - NEVER import the `Decimal` type from Prisma into a 'use client' file
 *   - DO apply these helpers at the server-component boundary
 *   - Server components that only render inline (e.g. order detail page
 *     using `formatNaira(Number(x))`) don't need these helpers — the
 *     Decimal values never leave the server.
 */
import type {
  StoreSettings,
  Product,
  ProductImage,
  ProductVariant,
} from '@prisma/client';

// ── StoreSettings ────────────────────────────────────────────────

export type SerializedStoreSettings = Omit<
  StoreSettings,
  'shippingFee' | 'freeShippingMin'
> & {
  shippingFee: number;
  freeShippingMin: number | null;
};

export function serializeStoreSettings(
  settings: StoreSettings,
): SerializedStoreSettings;
export function serializeStoreSettings(
  settings: StoreSettings | null,
): SerializedStoreSettings | null;
export function serializeStoreSettings(
  settings: StoreSettings | null,
): SerializedStoreSettings | null {
  if (!settings) return null;
  return {
    ...settings,
    shippingFee: Number(settings.shippingFee),
    freeShippingMin:
      settings.freeShippingMin === null
        ? null
        : Number(settings.freeShippingMin),
  };
}

// ── ProductVariant ───────────────────────────────────────────────

export type SerializedProductVariant = Omit<ProductVariant, 'price'> & {
  price: number;
};

export function serializeProductVariant(
  variant: ProductVariant,
): SerializedProductVariant {
  return { ...variant, price: Number(variant.price) };
}

// ── Product (with optional images + variants) ────────────────────

export type SerializedProduct = Omit<
  Product,
  'basePrice' | 'compareAtPrice'
> & {
  basePrice: number;
  compareAtPrice: number | null;
};

export type SerializedProductWithRelations = SerializedProduct & {
  images: ProductImage[];
  variants: SerializedProductVariant[];
};

/**
 * Serialize a Product (optionally including relations) for RSC transfer.
 * Pass the result of `prisma.product.findUnique({ include: { images, variants } })`.
 * The generic form preserves the presence/absence of relations in the
 * return type.
 */
export function serializeProduct(
  product: Product & { images: ProductImage[]; variants: ProductVariant[] },
): SerializedProductWithRelations;
export function serializeProduct(product: Product): SerializedProduct;
export function serializeProduct(
  product: Product & {
    images?: ProductImage[];
    variants?: ProductVariant[];
  },
): SerializedProduct | SerializedProductWithRelations {
  const base: SerializedProduct = {
    ...product,
    basePrice: Number(product.basePrice),
    compareAtPrice:
      product.compareAtPrice === null ? null : Number(product.compareAtPrice),
  };

  if (product.images && product.variants) {
    return {
      ...base,
      images: product.images,
      variants: product.variants.map(serializeProductVariant),
    };
  }

  return base;
}
