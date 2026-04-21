'use client';

import { useState } from 'react';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { ImageOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ProductImageLean } from '@/types/product';

const hasCloudinary = !!process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

/**
 * Dynamically load CldImage only when we actually need it. Two reasons:
 *   1. Lets Turbopack HMR handle the module cleanly (bare `require()` from
 *      inside a render body breaks fast refresh in edge cases).
 *   2. Avoids pulling the next-cloudinary bundle into pages that never
 *      render a real Cloudinary asset (dev / seed data uses Unsplash).
 */
const CldImageDynamic = dynamic(
  () => import('next-cloudinary').then((m) => m.CldImage),
  { ssr: false },
);

/**
 * Only route through CldImage when the stored url actually points at a
 * Cloudinary asset. Seed/mock data uses placeholder hosts (Unsplash,
 * placehold.co, etc.) with dummy publicIds that don't exist on Cloudinary;
 * those must render via next/image directly or CldImage emits a
 * "Failed to fetch" error in the browser console.
 */
function isCloudinaryUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return /res\.cloudinary\.com/.test(url);
}

/**
 * Gallery image with graceful fallback chain:
 *   CldImage (if configured) → next/image with image.url → "No image" placeholder
 *
 * This prevents broken/missing Cloudinary assets (common in dev with seed
 * data pointing at publicIds that don't exist) from emitting console errors
 * or rendering an empty frame. Any fetch/404 failure falls back to the next
 * tier automatically.
 */
function GalleryImage({
  image,
  alt,
  sizes,
  priority,
}: {
  image: ProductImageLean;
  alt: string;
  sizes: string;
  priority?: boolean;
}) {
  // Track which tier failed. 0 = try Cloudinary, 1 = try raw URL, 2 = placeholder.
  const canUseCld =
    hasCloudinary && !!image.publicId && isCloudinaryUrl(image.url);
  const [tier, setTier] = useState<0 | 1 | 2>(
    canUseCld ? 0 : image.url ? 1 : 2,
  );

  if (tier === 2) {
    return (
      <div className="bg-graphite text-muted flex h-full flex-col items-center justify-center gap-2">
        <ImageOff className="text-slate h-10 w-10" />
        <span className="text-xs">No image</span>
      </div>
    );
  }

  if (tier === 0) {
    return (
      <CldImageDynamic
        src={image.publicId}
        alt={alt}
        fill
        sizes={sizes}
        className="object-cover"
        priority={priority}
        onError={() => setTier(image.url ? 1 : 2)}
      />
    );
  }

  return (
    <Image
      src={image.url || '/placeholder.svg'}
      alt={alt}
      fill
      sizes={sizes}
      className="object-cover"
      priority={priority}
      onError={() => setTier(2)}
    />
  );
}

interface ProductGalleryProps {
  images: ProductImageLean[];
  productName: string;
}

export function ProductGallery({ images, productName }: ProductGalleryProps) {
  const sorted = [...images].sort((a, b) => a.sortOrder - b.sortOrder);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selected = sorted[selectedIndex];

  if (!sorted.length) {
    return (
      <div className="bg-charcoal text-muted flex aspect-square items-center justify-center rounded-lg">
        No images available
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="bg-charcoal relative aspect-square overflow-hidden rounded-lg">
        <GalleryImage
          image={selected}
          alt={selected.alt || productName}
          sizes="(max-width: 1024px) 100vw, 50vw"
          priority
        />
      </div>
      {sorted.length > 1 && (
        <div className="flex gap-2 overflow-x-auto">
          {sorted.map((img, i) => (
            <button
              key={img.id}
              onClick={() => setSelectedIndex(i)}
              className={cn(
                'relative h-16 w-16 shrink-0 overflow-hidden rounded-md border-2 transition-colors',
                i === selectedIndex
                  ? 'border-gold'
                  : 'border-slate hover:border-silver',
              )}
              aria-label={`View image ${i + 1}`}
            >
              <GalleryImage
                image={img}
                alt={img.alt || `${productName} ${i + 1}`}
                sizes="64px"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
