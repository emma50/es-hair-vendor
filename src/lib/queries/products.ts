import { cache } from 'react';
import { prisma } from '@/lib/prisma';
import { serialize } from '@/lib/utils';
import { safeQuery, safeList, safeFindOne } from './safe';
import {
  lagosStartOfDay,
  lagosStartOfWeek,
  lagosStartOfMonth,
} from '@/lib/time';
import { isOrderStatus } from '@/lib/order-state';
import { OrderStatus, type Prisma } from '@prisma/client';

/**
 * Every export below is wrapped in `safeQuery` (or its list/findOne
 * variants) so that a DB outage, missing table, or transient network
 * error degrades to an empty result instead of throwing all the way up
 * to `error.tsx`. Fallback shapes match the success shape exactly so
 * callers don't need any changes.
 */

// ----- Shared select fragments (field-level, no over-fetching) -----

const imageCardSelect = {
  id: true,
  url: true,
  publicId: true,
  alt: true,
  sortOrder: true,
  isPrimary: true,
} satisfies Prisma.ProductImageSelect;

const categoryLeanSelect = {
  id: true,
  name: true,
  slug: true,
} satisfies Prisma.CategorySelect;

/** Fields needed to render a ProductCard in listing grids */
const productCardSelect = {
  id: true,
  name: true,
  slug: true,
  basePrice: true,
  compareAtPrice: true,
  stockQuantity: true,
  createdAt: true, // needed for cursor ordering
  images: { select: imageCardSelect, orderBy: { sortOrder: 'asc' as const } },
  category: { select: categoryLeanSelect },
} satisfies Prisma.ProductSelect;

type ProductCardPayload = Prisma.ProductGetPayload<{
  select: typeof productCardSelect;
}>;

// ----- Storefront: paginated product list (cursor-based) -----

interface GetProductsParams {
  category?: string;
  sort?: string;
  cursor?: string; // product id for cursor-based pagination
  limit?: number;
  // Fallback offset pagination for page-number links
  page?: number;
}

export async function getProducts({
  category,
  sort = 'newest',
  cursor,
  limit = 20,
  page,
}: GetProductsParams = {}) {
  const currentPage = page && page > 0 ? page : 1;
  // Shape must match the success branch so callers don't need to special-case.
  const emptyResult = {
    products: [] as ProductCardPayload[],
    total: 0,
    totalPages: 0,
    currentPage,
    nextCursor: null as string | null,
    hasMore: false,
  };

  return safeQuery(
    async () => {
      const where: Prisma.ProductWhereInput = { isActive: true };

      if (category) {
        where.category = { slug: category };
      }

      const orderBy: Prisma.ProductOrderByWithRelationInput = {};
      switch (sort) {
        case 'price-asc':
          orderBy.basePrice = 'asc';
          break;
        case 'price-desc':
          orderBy.basePrice = 'desc';
          break;
        default:
          orderBy.createdAt = 'desc';
      }

      // Cursor-based pagination when cursor is provided
      if (cursor) {
        const products = await prisma.product.findMany({
          where,
          select: productCardSelect,
          orderBy,
          take: limit + 1, // fetch one extra to determine hasMore
          cursor: { id: cursor },
          skip: 1, // skip the cursor itself
        });

        const hasMore = products.length > limit;
        const items = hasMore ? products.slice(0, limit) : products;
        const nextCursor = hasMore
          ? (items[items.length - 1]?.id ?? null)
          : null;

        return {
          products: serialize(items),
          total: 0,
          totalPages: 0,
          currentPage,
          nextCursor,
          hasMore,
        };
      }

      // Offset pagination fallback (for page-number navigation / initial load)
      const [products, total] = await Promise.all([
        prisma.product.findMany({
          where,
          select: productCardSelect,
          orderBy,
          skip: (currentPage - 1) * limit,
          take: limit,
        }),
        prisma.product.count({ where }),
      ]);

      return {
        products: serialize(products),
        total,
        totalPages: Math.ceil(total / limit),
        currentPage,
        // Provide cursor for switching to cursor-based after initial load
        nextCursor:
          products.length === limit
            ? (products[products.length - 1]?.id ?? null)
            : null,
        hasMore: currentPage * limit < total,
      };
    },
    emptyResult,
    'getProducts',
  );
}

// ----- Storefront: single product detail page -----

/**
 * `cache` (React.cache) dedupes calls within a single server render.
 * The PDP's layout, metadata, JSON-LD block, and the page component
 * all call `getProductBySlug(slug)` for the same slug — without this
 * wrapper that's 4 identical DB round-trips per request. `cache`
 * memoises the promise so they all await the same query.
 *
 * Only safe for per-request-idempotent reads: no writes, no user-scoped
 * data, no mutation of results. `getProductBySlug` fits — it reads by
 * public slug and returns a plain serialisable object.
 */
export const getProductBySlug = cache(async (slug: string) => {
  return safeFindOne(async () => {
    const product = await prisma.product.findUnique({
      where: { slug, isActive: true },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        shortDescription: true,
        basePrice: true,
        compareAtPrice: true,
        stockQuantity: true,
        categoryId: true,
        sku: true,
        tags: true,
        metadata: true,
        images: { select: imageCardSelect, orderBy: { sortOrder: 'asc' } },
        variants: {
          where: { isActive: true },
          orderBy: { price: 'asc' },
          select: {
            id: true,
            label: true,
            price: true,
            stockQuantity: true,
            isActive: true,
          },
        },
        category: { select: categoryLeanSelect },
      },
    });
    return product ? serialize(product) : null;
  }, 'getProductBySlug');
});

// ----- Storefront: featured products (homepage) -----

export async function getFeaturedProducts(limit = 8) {
  return safeList(async () => {
    const products = await prisma.product.findMany({
      where: { isActive: true, isFeatured: true },
      select: productCardSelect,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return serialize(products);
  }, 'getFeaturedProducts');
}

// ----- Storefront: related products (PDP sidebar) -----

export async function getRelatedProducts(
  categoryId: string,
  excludeProductId: string,
  limit = 4,
) {
  return safeList(async () => {
    const products = await prisma.product.findMany({
      where: {
        isActive: true,
        categoryId,
        id: { not: excludeProductId },
      },
      select: productCardSelect,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return serialize(products);
  }, 'getRelatedProducts');
}

// ----- Admin: paginated product list (cursor-based) -----

const adminProductSelect = {
  id: true,
  name: true,
  sku: true,
  basePrice: true,
  stockQuantity: true,
  isActive: true,
  createdAt: true,
  images: {
    where: { isPrimary: true },
    take: 1,
    select: { url: true, alt: true },
  },
  category: { select: { name: true } },
} satisfies Prisma.ProductSelect;

type AdminProductPayload = Prisma.ProductGetPayload<{
  select: typeof adminProductSelect;
}>;

interface GetAdminProductsParams {
  search?: string;
  cursor?: string;
  limit?: number;
  page?: number;
  /**
   * 'active'   → only isActive products (storefront-facing set)
   * 'inactive' → only soft-deleted / hidden products
   * 'all'      → both (default for admin, so hidden drafts stay visible)
   */
  status?: 'all' | 'active' | 'inactive';
}

export async function getAdminProducts({
  search,
  cursor,
  limit = 20,
  page,
  status = 'all',
}: GetAdminProductsParams = {}) {
  const currentPage = page && page > 0 ? page : 1;
  const emptyResult = {
    products: [] as AdminProductPayload[],
    total: 0,
    totalPages: 0,
    currentPage,
    nextCursor: null as string | null,
    hasMore: false,
  };

  return safeQuery(
    async () => {
      const where: Prisma.ProductWhereInput = {};
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { sku: { contains: search, mode: 'insensitive' } },
        ];
      }
      if (status === 'active') where.isActive = true;
      else if (status === 'inactive') where.isActive = false;

      if (cursor) {
        const products = await prisma.product.findMany({
          where,
          select: adminProductSelect,
          orderBy: { createdAt: 'desc' },
          take: limit + 1,
          cursor: { id: cursor },
          skip: 1,
        });

        const hasMore = products.length > limit;
        const items = hasMore ? products.slice(0, limit) : products;

        return {
          products: serialize(items),
          total: 0,
          totalPages: 0,
          currentPage,
          nextCursor: hasMore
            ? (items[items.length - 1]?.id ?? null)
            : null,
          hasMore,
        };
      }

      const [products, total] = await Promise.all([
        prisma.product.findMany({
          where,
          select: adminProductSelect,
          orderBy: { createdAt: 'desc' },
          skip: (currentPage - 1) * limit,
          take: limit,
        }),
        prisma.product.count({ where }),
      ]);

      return {
        products: serialize(products),
        total,
        totalPages: Math.ceil(total / limit),
        currentPage,
        nextCursor:
          products.length === limit
            ? (products[products.length - 1]?.id ?? null)
            : null,
        hasMore: currentPage * limit < total,
      };
    },
    emptyResult,
    'getAdminProducts',
  );
}

// ----- Admin: paginated order list (cursor-based) -----

const adminOrderSelect = {
  id: true,
  orderNumber: true,
  status: true,
  channel: true,
  customerName: true,
  customerPhone: true,
  total: true,
  createdAt: true,
} satisfies Prisma.OrderSelect;

type AdminOrderPayload = Prisma.OrderGetPayload<{
  select: typeof adminOrderSelect;
}>;

const dashboardRecentOrderSelect = {
  id: true,
  orderNumber: true,
  customerName: true,
  total: true,
  status: true,
} satisfies Prisma.OrderSelect;

type DashboardRecentOrderPayload = Prisma.OrderGetPayload<{
  select: typeof dashboardRecentOrderSelect;
}>;

const dashboardLowStockSelect = {
  id: true,
  name: true,
  stockQuantity: true,
} satisfies Prisma.ProductSelect;

type DashboardLowStockPayload = Prisma.ProductGetPayload<{
  select: typeof dashboardLowStockSelect;
}>;

interface GetAdminOrdersParams {
  status?: string;
  search?: string;
  cursor?: string;
  limit?: number;
  page?: number;
}

export async function getAdminOrders({
  status,
  search,
  cursor,
  limit = 20,
  page,
}: GetAdminOrdersParams = {}) {
  const currentPage = page && page > 0 ? page : 1;
  const emptyResult = {
    orders: [] as AdminOrderPayload[],
    total: 0,
    totalPages: 0,
    currentPage,
    nextCursor: null as string | null,
    hasMore: false,
  };

  return safeQuery(
    async () => {
      const where: Prisma.OrderWhereInput = {};
      if (status && isOrderStatus(status)) {
        where.status = status;
      }
      if (search) {
        where.OR = [
          { orderNumber: { contains: search, mode: 'insensitive' } },
          { customerName: { contains: search, mode: 'insensitive' } },
          { customerPhone: { contains: search, mode: 'insensitive' } },
          { customerEmail: { contains: search, mode: 'insensitive' } },
        ];
      }

      if (cursor) {
        const orders = await prisma.order.findMany({
          where,
          select: adminOrderSelect,
          orderBy: { createdAt: 'desc' },
          take: limit + 1,
          cursor: { id: cursor },
          skip: 1,
        });

        const hasMore = orders.length > limit;
        const items = hasMore ? orders.slice(0, limit) : orders;

        return {
          orders: serialize(items),
          total: 0,
          totalPages: 0,
          currentPage,
          nextCursor: hasMore
            ? (items[items.length - 1]?.id ?? null)
            : null,
          hasMore,
        };
      }

      const [orders, total] = await Promise.all([
        prisma.order.findMany({
          where,
          select: adminOrderSelect,
          orderBy: { createdAt: 'desc' },
          skip: (currentPage - 1) * limit,
          take: limit,
        }),
        prisma.order.count({ where }),
      ]);

      return {
        orders: serialize(orders),
        total,
        totalPages: Math.ceil(total / limit),
        currentPage,
        nextCursor:
          orders.length === limit
            ? (orders[orders.length - 1]?.id ?? null)
            : null,
        hasMore: currentPage * limit < total,
      };
    },
    emptyResult,
    'getAdminOrders',
  );
}

// ----- Admin: dashboard data (batched single call) -----

export async function getDashboardData() {
  const emptyDashboard = {
    revenue: { today: 0, week: 0, month: 0 },
    recentOrders: [] as DashboardRecentOrderPayload[],
    lowStockProducts: [] as DashboardLowStockPayload[],
  };

  return safeQuery(
    async () => {
      // Bucket boundaries in Lagos time, not UTC. Without this the
      // admin's "today's revenue" tile rolls over at 1 AM Lagos
      // (UTC midnight) — yesterday's takings keep showing as "today"
      // until 1 AM, and weekly/monthly tiles drift the same way.
      const now = new Date();
      const startOfDay = lagosStartOfDay(now);
      const startOfWeek = lagosStartOfWeek(now);
      const startOfMonth = lagosStartOfMonth(now);

      const confirmedStatuses: OrderStatus[] = [
        OrderStatus.CONFIRMED,
        OrderStatus.PROCESSING,
        OrderStatus.SHIPPED,
        OrderStatus.DELIVERED,
      ];

      // Batch all 5 queries into a single Promise.all — no N+1
      const [
        todayRevenue,
        weekRevenue,
        monthRevenue,
        recentOrders,
        lowStockProducts,
      ] = await Promise.all([
        prisma.order.aggregate({
          where: {
            status: { in: confirmedStatuses },
            createdAt: { gte: startOfDay },
          },
          _sum: { total: true },
        }),
        prisma.order.aggregate({
          where: {
            status: { in: confirmedStatuses },
            createdAt: { gte: startOfWeek },
          },
          _sum: { total: true },
        }),
        prisma.order.aggregate({
          where: {
            status: { in: confirmedStatuses },
            createdAt: { gte: startOfMonth },
          },
          _sum: { total: true },
        }),
        prisma.order.findMany({
          select: dashboardRecentOrderSelect,
          orderBy: { createdAt: 'desc' },
          take: 5,
        }),
        prisma.product.findMany({
          where: { isActive: true, stockQuantity: { lte: 5 } },
          select: dashboardLowStockSelect,
          orderBy: { stockQuantity: 'asc' },
          take: 10,
        }),
      ]);

      return {
        revenue: {
          today: Number(todayRevenue._sum.total || 0),
          week: Number(weekRevenue._sum.total || 0),
          month: Number(monthRevenue._sum.total || 0),
        },
        recentOrders: serialize(recentOrders),
        lowStockProducts: serialize(lowStockProducts),
      };
    },
    emptyDashboard,
    'getDashboardData',
  );
}
