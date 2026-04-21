'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { PriceDisplay } from './PriceDisplay';
import type { ProductCardData } from '@/types/product';
import { ImageOff, ArrowUpRight } from 'lucide-react';

interface ProductCardProps {
  product: ProductCardData;
}

function ProductImageWithFallback({ src, alt }: { src: string; alt: string }) {
  const [error, setError] = useState(false);

  if (error || !src) {
    return (
      <div className="from-graphite to-charcoal text-muted flex h-full flex-col items-center justify-center gap-2 bg-gradient-to-br">
        <ImageOff className="text-slate h-10 w-10" />
        <span className="text-[0.7rem] tracking-wide uppercase">No image</span>
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
      className="object-cover transition-transform duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.06]"
      onError={() => setError(true)}
    />
  );
}

export function ProductCard({ product }: ProductCardProps) {
  const primaryImage =
    product.images.find((i) => i.isPrimary) || product.images[0];
  const soldOut = product.stockQuantity <= 0;
  const isOnSale =
    product.compareAtPrice &&
    Number(product.compareAtPrice) > Number(product.basePrice);

  return (
    <Link
      href={`/products/${product.slug}`}
      className="group border-slate/40 from-charcoal/80 to-charcoal/60 hover:border-gold/40 hover:shadow-card-hover relative block overflow-hidden rounded-2xl border bg-gradient-to-b backdrop-blur-sm transition-all duration-500 hover:-translate-y-1"
    >
      {/* Media */}
      <div className="bg-graphite relative aspect-[4/5] overflow-hidden">
        {primaryImage ? (
          <ProductImageWithFallback
            src={primaryImage.url}
            alt={primaryImage.alt || product.name}
          />
        ) : (
          <div className="text-muted flex h-full flex-col items-center justify-center gap-2">
            <ImageOff className="text-slate h-10 w-10" />
            <span className="text-[0.7rem] tracking-wide uppercase">
              No image
            </span>
          </div>
        )}

        {/* Bottom-to-top image fade so the text row below sits on a
            cleaner edge when the hero image has bright details. */}
        <div
          aria-hidden="true"
          className="from-charcoal/90 pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t to-transparent"
        />

        {/* Top-left: sale pill */}
        {isOnSale && !soldOut && (
          <div className="absolute top-3 left-3 flex flex-col items-start gap-1.5">
            <span className="border-gold/40 bg-midnight/80 text-gold inline-flex items-center rounded-full border px-2.5 py-1 text-[0.62rem] font-semibold tracking-[0.1em] uppercase backdrop-blur-md">
              Sale
            </span>
          </div>
        )}

        {/* Top-right: view arrow on hover */}
        <div className="absolute top-3 right-3 translate-y-1 opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100">
          <span className="border-gold/40 bg-midnight/80 text-gold inline-flex h-9 w-9 items-center justify-center rounded-full border backdrop-blur-md">
            <ArrowUpRight className="h-4 w-4" />
          </span>
        </div>

        {soldOut && (
          <div className="bg-midnight/80 absolute inset-0 flex items-center justify-center backdrop-blur-[2px]">
            <span className="border-error/40 bg-error/15 text-error rounded-full border px-4 py-1.5 text-[0.7rem] font-semibold tracking-[0.14em] uppercase backdrop-blur-md">
              Sold Out
            </span>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="relative p-5">
        <p className="text-gold/80 mb-2 text-[0.62rem] font-semibold tracking-[0.18em] uppercase">
          {product.category.name}
        </p>
        <h3 className="text-ivory group-hover:text-gold font-display mb-3 line-clamp-2 text-[0.98rem] leading-snug font-semibold tracking-tight transition-colors">
          {product.name}
        </h3>
        <PriceDisplay
          price={Number(product.basePrice)}
          compareAtPrice={
            product.compareAtPrice ? Number(product.compareAtPrice) : null
          }
          size="sm"
        />
      </div>
    </Link>
  );
}
