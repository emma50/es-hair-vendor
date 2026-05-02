'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth/require-admin';
import { productFormSchema } from '@/lib/validations';
import { slugify } from '@/lib/formatters';
import { logServerError } from '@/lib/log';
import type { ActionResult } from '@/types';
import * as Sentry from '@sentry/nextjs';
import { headers } from 'next/headers';

export interface ImageInput {
  /** Preserve id when round-tripping an existing image through the edit form. */
  id?: string;
  url: string;
  publicId: string;
  alt?: string;
  width?: number;
  height?: number;
  sortOrder: number;
  isPrimary: boolean;
}

export interface VariantInput {
  /** Preserve id when round-tripping an existing variant through the edit form. */
  id?: string;
  name: string;
  label: string;
  price: number;
  stockQuantity: number;
  sku?: string;
}

function unauthorizedResult(): ActionResult<never> {
  return { success: false, error: 'Unauthorized' };
}

/**
 * Invalidate every route that reads product data so edits show up
 * immediately on the public storefront. Called on every mutation.
 */
function revalidateProductRoutes(slug?: string) {
  revalidatePath('/admin/products');
  revalidatePath('/admin');
  revalidatePath('/products');
  if (slug) revalidatePath(`/products/${slug}`);
}

/**
 * Translate common Prisma errors into actionable admin-facing messages.
 * Prisma error codes: https://www.prisma.io/docs/reference/api-reference/error-reference
 */
function describePrismaError(
  error: unknown,
  fallback: string,
): ActionResult<never> {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? (error as { code?: string }).code
      : undefined;

  const meta =
    typeof error === 'object' && error !== null && 'meta' in error
      ? ((error as { meta?: { target?: string[] | string } }).meta ?? {})
      : {};

  if (code === 'P2002') {
    const target = Array.isArray(meta.target)
      ? meta.target.join(', ')
      : typeof meta.target === 'string'
        ? meta.target
        : '';
    if (target.includes('slug')) {
      return {
        success: false,
        error:
          'Another product has a very similar name — pick a more distinct name.',
      };
    }
    if (target.includes('sku')) {
      return {
        success: false,
        error: 'Another product already uses this SKU.',
      };
    }
    return { success: false, error: 'A matching record already exists.' };
  }
  if (code === 'P2003') {
    return {
      success: false,
      error: 'Related record not found. It may have been deleted.',
    };
  }
  if (code === 'P2025') {
    return {
      success: false,
      error: 'Record not found. It may have been deleted.',
    };
  }
  logServerError('products.action', error);
  return { success: false, error: fallback };
}

/**
 * Normalize the comma-separated tags input: trim, drop empties, dedupe
 * case-insensitively while preserving the first-seen casing.
 */
function normalizeTags(raw: string | undefined | null): string[] {
  if (!raw) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of raw.split(',')) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }
  return out;
}

export async function createProduct(
  formData: Record<string, unknown>,
  images: ImageInput[],
  variants: VariantInput[],
): Promise<ActionResult<{ id: string }>> {
  return Sentry.withServerActionInstrumentation(
    'createProduct',
    { headers: await headers() },
    async (): Promise<ActionResult<{ id: string }>> => {
      try {
        await requireAdmin();
      } catch {
        return unauthorizedResult();
      }

      const parsed = productFormSchema.safeParse(formData);
      if (!parsed.success) {
        return {
          success: false,
          error: 'Please check your form fields.',
          fieldErrors: parsed.error.flatten().fieldErrors,
        };
      }

      try {
        const slug = slugify(parsed.data.name);
        if (!slug) {
          return {
            success: false,
            error: 'Please use a name with letters or numbers.',
          };
        }
        const tags = normalizeTags(parsed.data.tags);

        const product = await prisma.product.create({
          data: {
            name: parsed.data.name,
            slug,
            description: parsed.data.description,
            shortDescription: parsed.data.shortDescription || null,
            categoryId: parsed.data.categoryId,
            basePrice: parsed.data.basePrice,
            compareAtPrice: parsed.data.compareAtPrice || null,
            sku: parsed.data.sku || null,
            stockQuantity: parsed.data.stockQuantity,
            isActive: parsed.data.isActive,
            isFeatured: parsed.data.isFeatured,
            tags,
            images: {
              create: images.map((img) => ({
                url: img.url,
                publicId: img.publicId,
                alt: img.alt || null,
                width: img.width,
                height: img.height,
                sortOrder: img.sortOrder,
                isPrimary: img.isPrimary,
              })),
            },
            variants: {
              create: variants.map((v) => ({
                name: v.name,
                label: v.label,
                price: v.price,
                stockQuantity: v.stockQuantity,
                sku: v.sku || null,
              })),
            },
          },
        });

        revalidateProductRoutes(slug);
        return { success: true, data: { id: product.id } };
      } catch (error) {
        return describePrismaError(error, 'Failed to create product.');
      }
    },
  );
}

export async function updateProduct(
  productId: string,
  formData: Record<string, unknown>,
  images: ImageInput[],
  variants: VariantInput[],
): Promise<ActionResult> {
  return Sentry.withServerActionInstrumentation(
    'updateProduct',
    { headers: await headers() },
    async (): Promise<ActionResult> => {
      try {
        await requireAdmin();
      } catch {
        return unauthorizedResult();
      }

      const parsed = productFormSchema.safeParse(formData);
      if (!parsed.success) {
        return {
          success: false,
          error: 'Please check your form fields.',
          fieldErrors: parsed.error.flatten().fieldErrors,
        };
      }

      try {
        const slug = slugify(parsed.data.name);
        if (!slug) {
          return {
            success: false,
            error: 'Please use a name with letters or numbers.',
          };
        }
        const tags = normalizeTags(parsed.data.tags);

        await prisma.$transaction(async (tx) => {
          await tx.product.update({
            where: { id: productId },
            data: {
              name: parsed.data.name,
              slug,
              description: parsed.data.description,
              shortDescription: parsed.data.shortDescription || null,
              categoryId: parsed.data.categoryId,
              basePrice: parsed.data.basePrice,
              compareAtPrice: parsed.data.compareAtPrice || null,
              sku: parsed.data.sku || null,
              stockQuantity: parsed.data.stockQuantity,
              isActive: parsed.data.isActive,
              isFeatured: parsed.data.isFeatured,
              tags,
            },
          });

          // --- Images: surgical diff so existing image ids are preserved.
          // Any image already carrying an id is UPDATED in place; images
          // without an id are CREATED; image ids no longer present in the
          // payload are DELETED. Order ids survive admin edits (no orphan
          // references for OrderItem.variantId, no churn on Cloudinary
          // publicIds, no cache-buster explosion on the public PDP).
          const existingImages = await tx.productImage.findMany({
            where: { productId },
            select: { id: true },
          });
          const submittedImageIds = new Set(
            images.map((i) => i.id).filter((id): id is string => !!id),
          );
          const imageIdsToDelete = existingImages
            .map((i) => i.id)
            .filter((id) => !submittedImageIds.has(id));

          if (imageIdsToDelete.length > 0) {
            await tx.productImage.deleteMany({
              where: { id: { in: imageIdsToDelete } },
            });
          }

          for (const img of images) {
            if (img.id) {
              await tx.productImage.update({
                where: { id: img.id },
                data: {
                  url: img.url,
                  publicId: img.publicId,
                  alt: img.alt || null,
                  width: img.width,
                  height: img.height,
                  sortOrder: img.sortOrder,
                  isPrimary: img.isPrimary,
                },
              });
            } else {
              await tx.productImage.create({
                data: {
                  productId,
                  url: img.url,
                  publicId: img.publicId,
                  alt: img.alt || null,
                  width: img.width,
                  height: img.height,
                  sortOrder: img.sortOrder,
                  isPrimary: img.isPrimary,
                },
              });
            }
          }

          // --- Variants: same id-preserving diff as images. Critically,
          // keeping variant ids stable means historical OrderItem rows
          // (which reference variant ids) stay valid — previously every
          // edit obliterated variants and re-created them, breaking the
          // CANCELLED → stock-restore path for any old order.
          const existingVariants = await tx.productVariant.findMany({
            where: { productId },
            select: { id: true },
          });
          const submittedVariantIds = new Set(
            variants.map((v) => v.id).filter((id): id is string => !!id),
          );
          const variantIdsToDelete = existingVariants
            .map((v) => v.id)
            .filter((id) => !submittedVariantIds.has(id));

          if (variantIdsToDelete.length > 0) {
            // Soft-delete semantics: if a variant is referenced by an
            // existing OrderItem, Prisma's default FK rule would reject
            // the delete. Try a hard delete first; fall back to marking
            // inactive if the FK blocks it.
            try {
              await tx.productVariant.deleteMany({
                where: { id: { in: variantIdsToDelete } },
              });
            } catch (err) {
              const code =
                typeof err === 'object' && err !== null && 'code' in err
                  ? (err as { code?: string }).code
                  : undefined;
              if (code === 'P2003' || code === 'P2014') {
                await tx.productVariant.updateMany({
                  where: { id: { in: variantIdsToDelete } },
                  data: { isActive: false },
                });
              } else {
                throw err;
              }
            }
          }

          for (const v of variants) {
            if (v.id) {
              await tx.productVariant.update({
                where: { id: v.id },
                data: {
                  name: v.name,
                  label: v.label,
                  price: v.price,
                  stockQuantity: v.stockQuantity,
                  sku: v.sku || null,
                },
              });
            } else {
              await tx.productVariant.create({
                data: {
                  productId,
                  name: v.name,
                  label: v.label,
                  price: v.price,
                  stockQuantity: v.stockQuantity,
                  sku: v.sku || null,
                },
              });
            }
          }
        });

        revalidateProductRoutes(slug);
        revalidatePath(`/admin/products/${productId}`);
        return { success: true, data: undefined };
      } catch (error) {
        return describePrismaError(error, 'Failed to update product.');
      }
    },
  );
}

export async function deleteProduct(productId: string): Promise<ActionResult> {
  return Sentry.withServerActionInstrumentation(
    'deleteProduct',
    { headers: await headers() },
    async (): Promise<ActionResult> => {
      try {
        await requireAdmin();
      } catch {
        return unauthorizedResult();
      }

      try {
        const updated = await prisma.product.update({
          where: { id: productId },
          data: { isActive: false },
          select: { slug: true },
        });
        revalidateProductRoutes(updated.slug);
        return { success: true, data: undefined };
      } catch (error) {
        return describePrismaError(error, 'Failed to delete product.');
      }
    },
  );
}

/**
 * Toggle a product's `isActive` flag from the admin list view. Used by
 * the quick activate/deactivate action so admins don't need to open
 * the edit page to hide or resurface a product.
 */
export async function setProductActive(
  productId: string,
  isActive: boolean,
): Promise<ActionResult> {
  return Sentry.withServerActionInstrumentation(
    'setProductActive',
    { headers: await headers() },
    async (): Promise<ActionResult> => {
      try {
        await requireAdmin();
      } catch {
        return unauthorizedResult();
      }
      try {
        const updated = await prisma.product.update({
          where: { id: productId },
          data: { isActive },
          select: { slug: true },
        });
        revalidateProductRoutes(updated.slug);
        return { success: true, data: undefined };
      } catch (error) {
        return describePrismaError(error, 'Failed to update product status.');
      }
    },
  );
}
