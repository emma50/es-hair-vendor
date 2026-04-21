'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import { useUrlState } from '@/hooks/useUrlState';
import { cn } from '@/lib/utils';

interface SearchInputProps {
  /** Base path to navigate to with search param, e.g. "/admin/products" */
  basePath: string;
  placeholder?: string;
  /**
   * Screen-reader label. Defaults to the placeholder, then falls back
   * to a plain "Search" so every instance stays accessible without the
   * caller having to remember to override it.
   */
  ariaLabel?: string;
}

export function SearchInput({
  basePath,
  placeholder = 'Search...',
  ariaLabel,
}: SearchInputProps) {
  const { get, set, remove, isNavigating } = useUrlState(basePath, 0); // no extra delay — useDebounce handles it
  const initialSearch = get('search');
  const [query, setQuery] = useState(initialSearch);
  const debouncedQuery = useDebounce(query, 350);
  const isInitialMount = useRef(true);

  // Navigate when debounced query changes (not on initial mount)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (debouncedQuery) {
      set('search', debouncedQuery);
    } else {
      remove('search');
    }
  }, [debouncedQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleClear() {
    setQuery('');
  }

  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
        {isNavigating ? (
          <Loader2 className="text-muted h-4 w-4 animate-spin" />
        ) : (
          <Search className="text-muted h-4 w-4" />
        )}
      </div>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        className={cn(
          'border-slate bg-graphite text-pearl placeholder:text-muted focus:border-gold h-10 w-full rounded-md border pr-9 pl-10 text-sm transition-opacity focus:outline-none',
          isNavigating && 'opacity-70',
        )}
        aria-label={ariaLabel || placeholder || 'Search'}
        autoComplete="off"
        spellCheck={false}
      />
      {query && (
        <button
          onClick={handleClear}
          type="button"
          className="text-muted hover:text-pearl absolute inset-y-0 right-0 flex items-center pr-3"
          aria-label="Clear search"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
