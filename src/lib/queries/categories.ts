import { prisma } from '@/lib/prisma';
import { safeList } from './safe';

/**
 * All category read queries are wrapped in `safeList` so a DB outage,
 * missing table, or empty result returns `[]` instead of crashing the
 * calling server component. Every UI that consumes these already
 * degrades to an EmptyState when the array is empty.
 */

/** Minimal category data for filter dropdowns */
export async function getCategories() {
  return safeList(
    () =>
      prisma.category.findMany({
        where: { isActive: true },
        select: { slug: true, name: true },
        orderBy: { sortOrder: 'asc' },
      }),
    'getCategories',
  );
}

/** Categories with active product counts — homepage tiles */
export async function getCategoriesWithCounts() {
  return safeList(
    () =>
      prisma.category.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          slug: true,
          _count: {
            select: { products: { where: { isActive: true } } },
          },
        },
        orderBy: { sortOrder: 'asc' },
      }),
    'getCategoriesWithCounts',
  );
}

/** Admin category list — includes description, isActive, product counts */
export async function getAdminCategories() {
  return safeList(
    () =>
      prisma.category.findMany({
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          isActive: true,
          sortOrder: true,
          _count: { select: { products: true } },
        },
        orderBy: { sortOrder: 'asc' },
      }),
    'getAdminCategories',
  );
}

/** Category options for product form dropdowns */
export async function getCategoryOptions() {
  return safeList(
    () =>
      prisma.category.findMany({
        where: { isActive: true },
        select: { id: true, name: true },
        orderBy: { sortOrder: 'asc' },
      }),
    'getCategoryOptions',
  );
}
