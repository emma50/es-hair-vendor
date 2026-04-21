import { describe, it, expect } from 'vitest';
import { existsSync } from 'fs';
import { resolve } from 'path';

/**
 * UI States Coverage Tests
 *
 * Validates that every route segment has the three required states:
 * 1. Error boundary (error.tsx) — with a way out (retry/back)
 * 2. Loading skeleton (loading.tsx) — content-shaped, not just a spinner
 * 3. Empty state — human message + next step
 *
 * These are structural tests: they verify the files exist so the
 * coverage can't silently regress when new routes are added.
 */

const SRC = resolve(__dirname, '..');
const APP = resolve(SRC, 'app');

// ── Route → required file mapping ────────────────────────────────

interface RouteRequirement {
  /** Route path for test description */
  route: string;
  /** Relative path from src/app to the directory */
  dir: string;
  /** Which files must exist in this directory */
  requires: ('error.tsx' | 'loading.tsx' | 'not-found.tsx')[];
}

const routes: RouteRequirement[] = [
  // Root
  {
    route: '/',
    dir: '.',
    requires: ['error.tsx', 'loading.tsx', 'not-found.tsx'],
  },

  // Storefront layout
  {
    route: '/(storefront)',
    dir: '(storefront)',
    requires: ['error.tsx', 'loading.tsx'],
  },

  // Storefront checkout
  {
    route: '/(storefront)/checkout',
    dir: '(storefront)/checkout',
    requires: ['error.tsx'],
  },

  // Storefront product detail
  {
    route: '/(storefront)/products/[slug]',
    dir: '(storefront)/products/[slug]',
    requires: ['not-found.tsx'],
  },

  // Admin layout
  {
    route: '/admin',
    dir: 'admin',
    requires: ['error.tsx', 'loading.tsx'],
  },

  // Admin products
  {
    route: '/admin/products',
    dir: 'admin/products',
    requires: ['loading.tsx'],
  },
  {
    route: '/admin/products/new',
    dir: 'admin/products/new',
    requires: ['loading.tsx'],
  },
  {
    route: '/admin/products/[id]',
    dir: 'admin/products/[id]',
    requires: ['loading.tsx', 'not-found.tsx'],
  },

  // Admin orders
  {
    route: '/admin/orders',
    dir: 'admin/orders',
    requires: ['loading.tsx'],
  },
  {
    route: '/admin/orders/[id]',
    dir: 'admin/orders/[id]',
    requires: ['loading.tsx', 'not-found.tsx'],
  },

  // Admin categories
  {
    route: '/admin/categories',
    dir: 'admin/categories',
    requires: ['loading.tsx'],
  },

  // Admin settings
  {
    route: '/admin/settings',
    dir: 'admin/settings',
    requires: ['loading.tsx'],
  },
];

describe('UI state coverage — every route has error, loading, and empty states', () => {
  for (const { route, dir, requires } of routes) {
    for (const file of requires) {
      it(`${route} has ${file}`, () => {
        const fullPath = resolve(APP, dir, file);
        expect(
          existsSync(fullPath),
          `Missing ${file} at ${dir}/${file}. Every route needs a ${file.replace('.tsx', '')} state.`,
        ).toBe(true);
      });
    }
  }
});

// ── ErrorState component contract ────────────────────────────────

describe('ErrorState component provides an escape route', () => {
  /**
   * Read error.tsx files and verify they reference either:
   * - onRetry (try again button)
   * - backHref (go somewhere safe)
   * - actionHref (do something else)
   *
   * This is a content check to enforce "never leave users stranded".
   */
  const errorFiles = [
    { name: 'root error', path: resolve(APP, 'error.tsx') },
    { name: 'storefront error', path: resolve(APP, '(storefront)/error.tsx') },
    {
      name: 'checkout error',
      path: resolve(APP, '(storefront)/checkout/error.tsx'),
    },
    { name: 'admin error', path: resolve(APP, 'admin/error.tsx') },
  ];

  for (const { name, path } of errorFiles) {
    it(`${name} has a retry or back action`, async () => {
      const fs = await import('fs');
      const content = fs.readFileSync(path, 'utf-8');
      const hasRetry = content.includes('onRetry') || content.includes('reset');
      const hasBack =
        content.includes('backHref') ||
        content.includes('href=') ||
        content.includes('actionHref');
      expect(
        hasRetry || hasBack,
        `${name} must provide a retry button or a back link. Users should never be stranded.`,
      ).toBe(true);
    });
  }
});

// ── Skeleton components exist ────────────────────────────────────

describe('skeleton components provide content-shaped loading states', () => {
  const skeletonFiles = [
    'components/ui/Skeleton.tsx',
    'components/skeletons/AdminSkeletons.tsx',
  ];

  for (const file of skeletonFiles) {
    it(`${file} exists`, () => {
      expect(existsSync(resolve(SRC, file))).toBe(true);
    });
  }
});

// ── Shared state components exist ────────────────────────────────

describe('shared state components exist', () => {
  const components = [
    { name: 'ErrorState', path: 'components/shared/ErrorState.tsx' },
    { name: 'EmptyState', path: 'components/shared/EmptyState.tsx' },
    { name: 'Spinner', path: 'components/ui/Spinner.tsx' },
    { name: 'Skeleton', path: 'components/ui/Skeleton.tsx' },
  ];

  for (const { name, path } of components) {
    it(`${name} component exists at ${path}`, () => {
      expect(existsSync(resolve(SRC, path))).toBe(true);
    });
  }
});
