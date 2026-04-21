import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { serializeProduct } from '@/lib/serialize';
import { ProductForm } from '../ProductForm';
import { getCategoryOptions } from '@/lib/queries/categories';
import { ErrorState } from '@/components/shared/ErrorState';
import { logServerWarn } from '@/lib/log';

interface EditProductPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: EditProductPageProps): Promise<Metadata> {
  const { id } = await params;
  try {
    const product = await prisma.product.findUnique({
      where: { id },
      select: { name: true },
    });
    return {
      title: product ? `Edit ${product.name} | Admin` : 'Edit Product | Admin',
    };
  } catch {
    return { title: 'Edit Product | Admin' };
  }
}

type ProductWithRelations = Prisma.ProductGetPayload<{
  include: { images: true; variants: true };
}>;

export default async function EditProductPage({
  params,
}: EditProductPageProps) {
  const { id } = await params;

  // Direct Prisma calls (no `safeFindOne` wrapper) so we can distinguish
  // "not found" (→ 404) from "transient DB error" (→ retry UI). The
  // admin edit screen is the one place where these two cases *must*
  // diverge — a 404 for a momentarily-offline DB would make the admin
  // think the product was deleted.
  let product: ProductWithRelations | null = null;
  let categories: Awaited<ReturnType<typeof getCategoryOptions>> = [];
  let transientError = false;

  try {
    [product, categories] = await Promise.all([
      prisma.product.findUnique({
        where: { id },
        include: {
          images: { orderBy: { sortOrder: 'asc' } },
          variants: true,
        },
      }),
      getCategoryOptions(),
    ]);
  } catch (error) {
    // P2025 is "record not found" — treat as 404. Any other Prisma
    // error (connection reset, pool exhausted, etc.) is transient.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    ) {
      notFound();
    }
    logServerWarn(
      'EditProductPage.load',
      error instanceof Error ? error.message : error,
    );
    transientError = true;
  }

  if (transientError) {
    return (
      <div>
        <h1 className="font-display text-ivory mb-6 text-2xl font-bold">
          Edit Product
        </h1>
        <ErrorState
          title="Couldn't load this product"
          message="We hit a problem reaching the database. Refresh the page to try again, or return to the products list."
          backHref="/admin/products"
          backLabel="Back to Products"
        />
      </div>
    );
  }

  if (!product) notFound();

  // Prisma `Decimal` (basePrice, compareAtPrice, variant.price) cannot
  // cross the RSC → client boundary — serializeProduct flattens every
  // Decimal column to a plain number so ProductForm stays serializable.
  const serialized = serializeProduct(product);

  return (
    <div>
      <h1 className="font-display text-ivory mb-6 text-2xl font-bold">
        Edit Product
      </h1>
      <ProductForm
        product={serialized}
        categories={categories.map((c) => ({ value: c.id, label: c.name }))}
      />
    </div>
  );
}
