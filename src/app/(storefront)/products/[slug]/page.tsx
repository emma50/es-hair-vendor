import type { Metadata } from 'next';
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { getProductBySlug, getRelatedProducts } from '@/lib/queries/products';
import { getCurrentUser } from '@/lib/auth/get-user';
import { ProductGallery } from '@/components/product/ProductGallery';
import { ProductDetails } from '@/components/product/ProductDetails';
import { ProductCard } from '@/components/product/ProductCard';
import { ProductGrid } from '@/components/product/ProductGrid';
import { Breadcrumbs } from '@/components/shared/Breadcrumbs';
import { StructuredData } from '@/components/shared/StructuredData';
import { Skeleton } from '@/components/ui/Skeleton';
import { AddToCartSection } from './AddToCartSection';

export const revalidate = 1800;

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: 'Product Not Found' };

  return {
    title: product.name,
    description: product.shortDescription || product.description.slice(0, 160),
    openGraph: {
      title: product.name,
      description:
        product.shortDescription || product.description.slice(0, 160),
      images: product.images[0] ? [{ url: product.images[0].url }] : undefined,
    },
  };
}

/** Lazy-loaded related products — deferred until the main product is painted */
async function RelatedProducts({
  categoryId,
  excludeId,
}: {
  categoryId: string;
  excludeId: string;
}) {
  const relatedProducts = await getRelatedProducts(categoryId, excludeId, 4);

  if (relatedProducts.length === 0) return null;

  return (
    <section className="mt-16">
      <h2 className="font-display text-ivory mb-6 text-2xl font-semibold">
        You May Also Like
      </h2>
      <ProductGrid>
        {relatedProducts.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </ProductGrid>
    </section>
  );
}

function RelatedProductsSkeleton() {
  return (
    <section className="mt-16">
      <Skeleton className="mb-6 h-8 w-48" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="aspect-[4/5] w-full" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-5 w-1/3" />
          </div>
        ))}
      </div>
    </section>
  );
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const [product, current] = await Promise.all([
    getProductBySlug(slug),
    getCurrentUser(),
  ]);

  if (!product) notFound();

  const productSchema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.shortDescription || product.description,
    image: product.images.map((i) => i.url),
    brand: { '@type': 'Brand', name: 'Emmanuel Sarah Hair' },
    sku: product.sku || product.id,
    offers: {
      '@type': 'Offer',
      price: Number(product.basePrice),
      priceCurrency: 'NGN',
      availability:
        product.stockQuantity > 0
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
    },
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <StructuredData data={productSchema} />

      <Breadcrumbs
        items={[
          { label: 'Home', href: '/' },
          { label: 'Shop', href: '/products' },
          {
            label: product.category.name,
            href: `/products?category=${product.category.slug}`,
          },
          { label: product.name },
        ]}
      />

      <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
        <ProductGallery images={product.images} productName={product.name} />

        <div className="space-y-6">
          <ProductDetails
            name={product.name}
            description={product.description}
            price={Number(product.basePrice)}
            compareAtPrice={
              product.compareAtPrice ? Number(product.compareAtPrice) : null
            }
            stockQuantity={product.stockQuantity}
            categoryName={product.category.name}
            tags={product.tags}
            sku={product.sku}
            metadata={product.metadata as Record<string, unknown> | null}
          />

          <AddToCartSection product={product} isAuthenticated={!!current} />
        </div>
      </div>

      {/* Lazy load related products — doesn't block main content paint */}
      <Suspense fallback={<RelatedProductsSkeleton />}>
        <RelatedProducts
          categoryId={product.categoryId}
          excludeId={product.id}
        />
      </Suspense>
    </div>
  );
}
