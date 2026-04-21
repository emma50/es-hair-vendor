'use client';

import { cn } from '@/lib/utils';
import { useUrlState } from '@/hooks/useUrlState';

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
];

export function SortSelector() {
  const { get, set, isNavigating } = useUrlState('/products', 150);
  const currentSort = get('sort') || 'newest';

  return (
    <select
      value={currentSort}
      onChange={(e) => set('sort', e.target.value)}
      disabled={isNavigating}
      className={cn(
        'border-slate bg-graphite text-pearl focus:border-gold h-10 rounded-md border px-3 text-sm transition-opacity focus:outline-none',
        isNavigating && 'opacity-60',
      )}
      aria-label="Sort products"
    >
      {SORT_OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
