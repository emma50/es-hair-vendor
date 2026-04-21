import type {
  Product,
  ProductImage,
  ProductVariant,
  Category,
} from '@prisma/client';

// ----- Full entity types (used in admin forms / full product page) -----

export type ProductWithImages = Product & {
  images: ProductImage[];
  category: Category;
};

export type ProductWithVariants = Product & {
  images: ProductImage[];
  variants: ProductVariant[];
  category: Category;
};

export type CategoryWithCount = Category & {
  _count: { products: number };
};

// ----- Lean / field-level types (only fields the UI actually needs) -----

/** Image fields needed for product cards and galleries */
export type ProductImageLean = Pick<
  ProductImage,
  'id' | 'url' | 'publicId' | 'alt' | 'sortOrder' | 'isPrimary'
>;

/** Category fields needed when displayed alongside a product */
export type CategoryLean = Pick<Category, 'id' | 'name' | 'slug'>;

/** Product card — storefront listing grids, featured sections, related products */
export type ProductCardData = Pick<
  Product,
  'id' | 'name' | 'slug' | 'basePrice' | 'compareAtPrice' | 'stockQuantity'
> & {
  images: ProductImageLean[];
  category: CategoryLean;
};

/** Full product detail — storefront PDP */
export type ProductDetailData = Pick<
  Product,
  | 'id'
  | 'name'
  | 'slug'
  | 'description'
  | 'shortDescription'
  | 'basePrice'
  | 'compareAtPrice'
  | 'stockQuantity'
  | 'categoryId'
  | 'sku'
  | 'tags'
  | 'metadata'
> & {
  images: ProductImageLean[];
  variants: Pick<
    ProductVariant,
    'id' | 'label' | 'price' | 'stockQuantity' | 'isActive'
  >[];
  category: CategoryLean;
};

/** Category filter items — just slug + name for nav */
export type CategoryFilterItem = Pick<Category, 'slug' | 'name'>;

/** Category with product count — homepage tiles */
export type CategoryWithCountLean = Pick<Category, 'id' | 'name' | 'slug'> & {
  _count: { products: number };
};

/** Admin product list — table row data */
export type AdminProductRow = Pick<
  Product,
  | 'id'
  | 'name'
  | 'sku'
  | 'basePrice'
  | 'stockQuantity'
  | 'isActive'
  | 'createdAt'
> & {
  images: Pick<ProductImage, 'url' | 'alt'>[];
  category: Pick<Category, 'name'>;
};

/** Admin order list — table row data */
export type AdminOrderRow = {
  id: string;
  orderNumber: string;
  status: string;
  channel: string;
  customerName: string;
  customerPhone: string;
  total: number | string;
  createdAt: Date | string;
};

/** Admin dashboard — recent order summary */
export type DashboardOrderSummary = {
  id: string;
  orderNumber: string;
  customerName: string;
  total: number | string;
  status: string;
};

/** Admin dashboard — low stock product */
export type LowStockProduct = Pick<Product, 'id' | 'name' | 'stockQuantity'>;
