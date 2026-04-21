'use client';

import { cn } from '@/lib/utils';
import { useUrlState } from '@/hooks/useUrlState';

interface CategoryFilterProps {
  categories: { slug: string; name: string }[];
}

export function CategoryFilter({ categories }: CategoryFilterProps) {
  const { get, set, remove, isNavigating } = useUrlState('/products', 150);
  const activeCategory = get('category');

  function handleFilter(slug: string) {
    if (slug) {
      set('category', slug);
    } else {
      remove('category');
    }
  }

  return (
    <div
      className={cn(
        'scrollbar-none flex gap-2 overflow-x-auto pb-2 transition-opacity',
        isNavigating && 'pointer-events-none opacity-60',
      )}
      role="tablist"
      aria-label="Filter by category"
    >
      <button
        onClick={() => handleFilter('')}
        disabled={isNavigating}
        className={cn(
          'shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors',
          !activeCategory
            ? 'bg-gold text-midnight'
            : 'bg-charcoal text-silver hover:text-pearl',
        )}
        role="tab"
        aria-selected={!activeCategory}
      >
        All
      </button>
      {categories.map((cat) => (
        <button
          key={cat.slug}
          onClick={() => handleFilter(cat.slug)}
          disabled={isNavigating}
          className={cn(
            'shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors',
            activeCategory === cat.slug
              ? 'bg-gold text-midnight'
              : 'bg-charcoal text-silver hover:text-pearl',
          )}
          role="tab"
          aria-selected={activeCategory === cat.slug}
        >
          {cat.name}
        </button>
      ))}
    </div>
  );
}
