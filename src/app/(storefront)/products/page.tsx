import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Search } from 'lucide-react';
import { getProducts } from '@/lib/queries/products';
import { getCategories } from '@/lib/queries/categories';
import { ProductCard } from '@/components/product/ProductCard';
import { ProductGrid } from '@/components/product/ProductGrid';
import { CategoryFilter } from '@/components/product/CategoryFilter';
import { SortSelector } from '@/components/product/SortSelector';
import { EmptyState } from '@/components/shared/EmptyState';
import { Breadcrumbs } from '@/components/shared/Breadcrumbs';
import { Skeleton } from '@/components/ui/Skeleton';

export const revalidate = 1800;

interface ProductsPageProps {
  searchParams: Promise<{
    category?: string;
    sort?: string;
    page?: string;
  }>;
}

export async function generateMetadata({
  searchParams,
}: ProductsPageProps): Promise<Metadata> {
  const params = await searchParams;
  const categoryName = params.category
    ? params.category.replace(/-/g, ' ')
    : null;

  return {
    title: categoryName
      ? `${categoryName.charAt(0).toUpperCase() + categoryName.slice(1)} — Shop`
      : 'Shop Our Collection',
    description:
      'Browse our curated collection of premium human hair bundles, closures, frontals, and wigs.',
  };
}

async function ProductList({
  category,
  sort,
  page,
}: {
  category?: string;
  sort?: string;
  page: number;
}) {
  const result = await getProducts({ category, sort, page });

  if (result.products.length === 0) {
    return (
      <EmptyState
        icon={Search}
        title={category ? 'No products in this category' : 'No products found'}
        description={
          category
            ? 'Try selecting a different category or browse all our products.'
            : "We're adding new products soon. Check back later or reach out to us on WhatsApp."
        }
        actionLabel="View All Products"
        actionHref="/products"
      />
    );
  }

  return (
    <>
      <p className="text-muted mb-6 text-sm">
        {result.total} product{result.total !== 1 ? 's' : ''}
      </p>
      <ProductGrid>
        {result.products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </ProductGrid>

      {/* Pagination with cursor hint for client-side infinite scroll */}
      {result.hasMore && result.nextCursor && (
        <div className="mt-8 text-center">
          <a
            href={`?${new URLSearchParams({
              ...(category ? { category } : {}),
              ...(sort ? { sort } : {}),
              page: String((result.currentPage ?? 1) + 1),
            }).toString()}`}
            className="border-slate bg-charcoal text-silver hover:border-gold hover:text-gold inline-flex items-center gap-2 rounded-lg border px-6 py-2.5 text-sm font-medium transition-colors"
          >
            Load More
          </a>
        </div>
      )}
    </>
  );
}

function ProductListSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="space-y-3">
          <Skeleton className="aspect-[4/5] w-full" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-5 w-1/3" />
        </div>
      ))}
    </div>
  );
}

export default async function ProductsPage({
  searchParams,
}: ProductsPageProps) {
  const params = await searchParams;
  // getCategories now returns lean { slug, name } objects directly
  const categories = await getCategories();
  // Parse + clamp the page param. Without clamping, `?page=9999999999`
  // becomes a SKIP of 9B rows — cheap to ask for, expensive for
  // Postgres to service. `MAX_PAGE` caps the reachable depth to what a
  // real catalogue browse could ever want; anything higher is either
  // a crawler or abuse and silently snaps to the last allowed page.
  // NaN / negative / zero all fall back to page 1.
  const MAX_PAGE = 500;
  const parsedPage = params.page ? Number.parseInt(params.page, 10) : 1;
  const page =
    Number.isFinite(parsedPage) && parsedPage > 0
      ? Math.min(parsedPage, MAX_PAGE)
      : 1;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Shop' }]} />

      <h1 className="font-display text-ivory mb-6 text-[clamp(2rem,5vw,3rem)] font-bold">
        Shop Our Collection
      </h1>

      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <CategoryFilter categories={categories} />
        <SortSelector />
      </div>

      <Suspense fallback={<ProductListSkeleton />}>
        <ProductList
          category={params.category}
          sort={params.sort}
          page={page}
        />
      </Suspense>
    </div>
  );
}
