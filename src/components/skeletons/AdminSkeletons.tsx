import { Skeleton } from '@/components/ui/Skeleton';

/**
 * Consistent skeleton patterns for admin pages.
 * Every page that loads server data must have a matching skeleton.
 */

/** Revenue cards on admin dashboard */
export function DashboardSkeleton() {
  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-9 w-32 rounded-md" />
      </div>

      {/* Revenue cards */}
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="border-slate bg-charcoal rounded-lg border p-6"
          >
            <Skeleton className="mb-2 h-4 w-20" />
            <Skeleton className="h-8 w-28" />
          </div>
        ))}
      </div>

      {/* Two-column panels */}
      <div className="grid gap-8 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            key={i}
            className="border-slate bg-charcoal rounded-lg border p-6"
          >
            <Skeleton className="mb-4 h-6 w-36" />
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j} className="flex justify-between">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-20" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Table skeleton for products/orders list pages */
export function TableSkeleton({
  rows = 5,
  cols = 6,
}: {
  rows?: number;
  cols?: number;
}) {
  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-9 w-32 rounded-md" />
      </div>

      {/* Search bar */}
      <div className="mb-4 max-w-sm">
        <Skeleton className="h-10 w-full rounded-md" />
      </div>

      {/* Table */}
      <div className="border-slate overflow-hidden rounded-lg border">
        {/* Table header */}
        <div className="border-slate bg-graphite border-b px-4 py-3">
          <div className="flex gap-6">
            {Array.from({ length: cols }).map((_, i) => (
              <Skeleton key={i} className="h-4 w-20" />
            ))}
          </div>
        </div>
        {/* Table rows */}
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="border-slate flex items-center gap-6 border-b px-4 py-4 last:border-b-0"
          >
            {Array.from({ length: cols }).map((_, j) => (
              <Skeleton
                key={j}
                className={`h-4 ${j === 0 ? 'w-32' : 'w-16'}`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Form skeleton for product/category edit pages */
export function FormSkeleton({ sections = 3 }: { sections?: number }) {
  return (
    <div>
      <Skeleton className="mb-6 h-8 w-48" />
      <div className="space-y-6">
        {Array.from({ length: sections }).map((_, i) => (
          <div
            key={i}
            className="border-slate bg-charcoal rounded-lg border p-6"
          >
            <Skeleton className="mb-4 h-6 w-32" />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full rounded-md" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full rounded-md" />
              </div>
            </div>
          </div>
        ))}
        <Skeleton className="h-10 w-36 rounded-md" />
      </div>
    </div>
  );
}

/** Settings page skeleton */
export function SettingsSkeleton() {
  return (
    <div>
      <Skeleton className="mb-6 h-8 w-40" />
      <div className="space-y-6">
        {['Store Info', 'Shipping', 'Storefront'].map((_, i) => (
          <div
            key={i}
            className="border-slate bg-charcoal rounded-lg border p-6"
          >
            <Skeleton className="mb-4 h-6 w-28" />
            <div className="grid gap-4 sm:grid-cols-2">
              {Array.from({ length: i === 0 ? 4 : 2 }).map((_, j) => (
                <div key={j} className="space-y-2">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-10 w-full rounded-md" />
                </div>
              ))}
            </div>
          </div>
        ))}
        <Skeleton className="h-10 w-32 rounded-md" />
      </div>
    </div>
  );
}

/** Categories list skeleton */
export function CategoriesSkeleton() {
  return (
    <div>
      <Skeleton className="mb-6 h-8 w-40" />
      {/* Add form area */}
      <div className="border-slate bg-charcoal rounded-lg border p-6">
        <div className="flex gap-3">
          <Skeleton className="h-10 flex-1 rounded-md" />
          <Skeleton className="h-10 w-28 rounded-md" />
        </div>
      </div>
      {/* Category list */}
      <div className="mt-8 space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="border-slate bg-charcoal flex items-center justify-between rounded-lg border p-4"
          >
            <div className="space-y-1">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Order detail skeleton */
export function OrderDetailSkeleton() {
  return (
    <div>
      <Skeleton className="mb-6 h-8 w-56" />
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Items */}
          <div className="border-slate bg-charcoal rounded-lg border p-6">
            <Skeleton className="mb-4 h-6 w-24" />
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="border-slate flex justify-between border-b py-3 last:border-b-0"
              >
                <div className="space-y-1">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
          {/* Customer info */}
          <div className="border-slate bg-charcoal rounded-lg border p-6">
            <Skeleton className="mb-4 h-6 w-32" />
            <div className="grid gap-3 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-1">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-4 w-36" />
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="space-y-6">
          <div className="border-slate bg-charcoal rounded-lg border p-6">
            <Skeleton className="mb-3 h-6 w-32" />
            <Skeleton className="mb-3 h-10 w-full rounded-md" />
            <Skeleton className="h-9 w-full rounded-md" />
          </div>
        </div>
      </div>
    </div>
  );
}
