import type { Metadata } from 'next';
import { Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { formatNaira } from '@/lib/formatters';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/shared/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { Plus, Package, ImageOff } from 'lucide-react';
import { ITEMS_PER_PAGE } from '@/lib/constants';
import { getAdminProducts } from '@/lib/queries/products';
import { SearchInput } from '@/components/admin/SearchInput';
import { ProductRowActions } from './ProductRowActions';

type StatusFilter = 'all' | 'active' | 'inactive';

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Hidden' },
];

function parseStatus(raw: string | undefined): StatusFilter {
  if (raw === 'active' || raw === 'inactive') return raw;
  return 'all';
}

export const metadata: Metadata = {
  title: 'Products | Admin',
};

/**
 * Build a querystring preserving search and status filters. All values are
 * URI-encoded so names containing `&`, `#`, spaces, or other reserved
 * characters don't break pagination links.
 */
function buildQuery(params: Record<string, string | number | undefined>) {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    parts.push(
      `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`,
    );
  }
  return parts.length > 0 ? `?${parts.join('&')}` : '';
}

interface AdminProductsPageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
    status?: string;
  }>;
}

export default async function AdminProductsPage({
  searchParams,
}: AdminProductsPageProps) {
  const params = await searchParams;
  const pageParam = params.page ? parseInt(params.page, 10) : 1;
  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;
  const search = params.search?.trim() || '';
  const status = parseStatus(params.status);

  const { products, totalPages } = await getAdminProducts({
    search: search || undefined,
    page,
    limit: ITEMS_PER_PAGE,
    status,
  });

  const isFiltered = Boolean(search) || status !== 'all';

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-ivory text-2xl font-bold">Products</h1>
        <Link href="/admin/products/new">
          <Button size="sm">
            <Plus className="h-4 w-4" /> Add Product
          </Button>
        </Link>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-sm flex-1">
          <Suspense fallback={<Skeleton className="h-10 w-full rounded-md" />}>
            <SearchInput
              basePath="/admin/products"
              placeholder="Search products by name or SKU..."
              ariaLabel="Search products by name or SKU"
            />
          </Suspense>
        </div>
        <div
          role="tablist"
          aria-label="Filter products by status"
          className="border-slate bg-charcoal inline-flex rounded-md border p-1 text-xs"
        >
          {STATUS_OPTIONS.map((option) => {
            const active = option.value === status;
            const query = buildQuery({
              search: search || undefined,
              status: option.value === 'all' ? undefined : option.value,
            });
            return (
              <Link
                key={option.value}
                role="tab"
                aria-selected={active}
                href={`/admin/products${query}`}
                className={`rounded px-3 py-1.5 font-medium transition-colors ${
                  active
                    ? 'bg-gold text-midnight'
                    : 'text-silver hover:text-pearl'
                }`}
              >
                {option.label}
              </Link>
            );
          })}
        </div>
      </div>

      {products.length === 0 ? (
        <EmptyState
          icon={Package}
          title={
            isFiltered ? 'No products match your filters' : 'No products yet'
          }
          description={
            isFiltered
              ? search
                ? `We couldn't find any products matching "${search}". Try a different search term or clear the filter.`
                : 'No products match this filter. Try switching the status tab.'
              : 'Get started by adding your first product to the catalog.'
          }
          actionLabel={isFiltered ? undefined : 'Add Product'}
          actionHref={isFiltered ? undefined : '/admin/products/new'}
        />
      ) : (
        <div className="border-slate overflow-x-auto rounded-lg border">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">
              Admin products — thumbnail, name, category, price, stock, status,
              and row actions.
            </caption>
            <thead className="border-slate bg-graphite border-b">
              <tr>
                <th className="text-silver w-16 px-4 py-3 font-medium">
                  <span className="sr-only">Image</span>
                </th>
                <th className="text-silver px-4 py-3 font-medium">Product</th>
                <th className="text-silver px-4 py-3 font-medium">Category</th>
                <th className="text-silver px-4 py-3 font-medium">Price</th>
                <th className="text-silver px-4 py-3 font-medium">Stock</th>
                <th className="text-silver px-4 py-3 font-medium">Status</th>
                <th className="text-silver px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-slate divide-y">
              {products.map((product) => {
                const thumb = product.images[0];
                return (
                  <tr
                    key={product.id}
                    className="hover:bg-midnight transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="border-slate bg-graphite relative h-10 w-10 overflow-hidden rounded-md border">
                        {thumb ? (
                          <Image
                            src={thumb.url}
                            alt={thumb.alt || product.name}
                            fill
                            sizes="40px"
                            className="object-cover"
                          />
                        ) : (
                          <div className="text-muted flex h-full w-full items-center justify-center">
                            <ImageOff className="h-4 w-4" />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-pearl font-medium">{product.name}</p>
                      {product.sku && (
                        <p className="text-muted font-mono text-xs">
                          {product.sku}
                        </p>
                      )}
                    </td>
                    <td className="text-silver px-4 py-3">
                      {product.category.name}
                    </td>
                    <td className="text-gold px-4 py-3">
                      {formatNaira(Number(product.basePrice))}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={
                          product.stockQuantity <= 0
                            ? 'error'
                            : product.stockQuantity <= 5
                              ? 'warning'
                              : 'success'
                        }
                      >
                        {product.stockQuantity}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={product.isActive ? 'success' : 'default'}
                      >
                        {product.isActive ? 'Active' : 'Hidden'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <ProductRowActions
                        productId={product.id}
                        productName={product.name}
                        isActive={product.isActive}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {(totalPages ?? 0) > 1 && (
        <nav
          aria-label="Pagination"
          className="mt-4 flex justify-center gap-2"
        >
          {Array.from({ length: totalPages! }, (_, i) => {
            const pageNum = i + 1;
            const query = buildQuery({
              page: pageNum,
              search: search || undefined,
              status: status === 'all' ? undefined : status,
            });
            const isCurrent = page === pageNum;
            return (
              <Link
                key={pageNum}
                href={`/admin/products${query}`}
                aria-current={isCurrent ? 'page' : undefined}
                className={`rounded-md px-3 py-1.5 text-sm ${
                  isCurrent
                    ? 'bg-gold text-midnight'
                    : 'bg-charcoal text-silver hover:text-pearl'
                }`}
              >
                {pageNum}
              </Link>
            );
          })}
        </nav>
      )}
    </div>
  );
}
