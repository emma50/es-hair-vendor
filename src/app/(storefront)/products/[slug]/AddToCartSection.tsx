'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import {
  VariantSelector,
  type VariantLean,
} from '@/components/product/VariantSelector';
import { PriceDisplay } from '@/components/product/PriceDisplay';
import { StockBadge } from '@/components/product/StockBadge';
import { useCart } from '@/hooks/useCart';
import { useToast } from '@/components/ui/Toast';
import { buildWhatsAppInquiryUrl } from '@/lib/whatsapp';
import { STORE_CONFIG } from '@/lib/constants';
import type { ProductDetailData } from '@/types/product';
import Link from 'next/link';
import { LogIn, MessageCircle, ShoppingBag } from 'lucide-react';

interface AddToCartSectionProps {
  product: ProductDetailData;
  /** Whether the current visitor is signed in. When false the add-to-cart
   *  button is replaced with a "Sign in to shop" link — cart routes are
   *  auth-protected, so guests can never reach the cart anyway. */
  isAuthenticated: boolean;
}

export function AddToCartSection({
  product,
  isAuthenticated,
}: AddToCartSectionProps) {
  const { addItem } = useCart();
  const { toast } = useToast();
  const [selectedVariant, setSelectedVariant] = useState<VariantLean | null>(
    null,
  );

  const hasVariants = product.variants.length > 0;
  const activePrice = selectedVariant
    ? Number(selectedVariant.price)
    : Number(product.basePrice);
  const activeStock = selectedVariant
    ? selectedVariant.stockQuantity
    : product.stockQuantity;
  const primaryImage =
    product.images.find((i) => i.isPrimary) || product.images[0];

  const whatsappNumber = STORE_CONFIG.whatsappNumber;
  const appUrl = STORE_CONFIG.appUrl;

  function handleAddToCart() {
    if (hasVariants && !selectedVariant) {
      toast('Please select an option', 'warning');
      return;
    }
    if (activeStock <= 0) {
      toast('This item is out of stock', 'error');
      return;
    }

    addItem({
      productId: product.id,
      variantId: selectedVariant?.id || null,
      name: product.name,
      variantName: selectedVariant?.label || null,
      price: activePrice,
      quantity: 1,
      image: primaryImage?.url || '',
      slug: product.slug,
      maxStock: activeStock,
    });

    toast('Added to cart!', 'success');
  }

  return (
    <div className="border-slate space-y-6 border-t pt-6">
      {hasVariants && (
        <>
          <VariantSelector
            variants={product.variants}
            selectedId={selectedVariant?.id || null}
            onSelect={setSelectedVariant}
          />
          {selectedVariant && (
            <div className="space-y-2">
              <PriceDisplay price={activePrice} />
              <StockBadge quantity={activeStock} />
            </div>
          )}
        </>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        {isAuthenticated ? (
          <Button
            onClick={handleAddToCart}
            disabled={activeStock <= 0}
            size="lg"
            className="flex-1"
          >
            <ShoppingBag className="h-5 w-5" />
            {activeStock <= 0 ? 'Out of Stock' : 'Add to Cart'}
          </Button>
        ) : (
          <Link
            href={`/auth/login?redirect=/products/${product.slug}`}
            className="flex-1"
          >
            <Button variant="secondary" size="lg" className="w-full">
              <LogIn className="h-5 w-5" />
              Sign in to shop
            </Button>
          </Link>
        )}

        {whatsappNumber && (
          <a
            href={buildWhatsAppInquiryUrl(
              product.name,
              `${appUrl}/products/${product.slug}`,
              whatsappNumber,
            )}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="whatsapp" size="lg" className="w-full sm:w-auto">
              <MessageCircle className="h-5 w-5" />
              Ask on WhatsApp
            </Button>
          </a>
        )}
      </div>
    </div>
  );
}
