'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth/require-admin';
import { categoryFormSchema, categoryReorderSchema } from '@/lib/validations';
import { slugify } from '@/lib/formatters';
import { logServerError } from '@/lib/log';
import type { ActionResult } from '@/types';
import * as Sentry from '@sentry/nextjs';
import { headers } from 'next/headers';

/**
 * Centralised Prisma error translation so the admin sees a specific
 * message rather than the generic "Failed to…" soup for the most
 * common mistakes (duplicate name / slug, missing row).
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
          'Another category has a very similar name — pick a more distinct name.',
      };
    }
    return {
      success: false,
      error: 'A category with this name already exists.',
    };
  }
  if (code === 'P2003' || code === 'P2014') {
    return {
      success: false,
      error:
        'Category is still linked to products. Reassign or remove those products first.',
    };
  }
  if (code === 'P2025') {
    return { success: false, error: 'Category not found.' };
  }
  logServerError('categories.action', error);
  return { success: false, error: fallback };
}

function revalidateCategoryRoutes() {
  revalidatePath('/admin/categories');
  revalidatePath('/admin/products');
  revalidatePath('/products');
  revalidatePath('/');
}

export async function createCategory(
  formData: Record<string, unknown>,
): Promise<ActionResult<{ id: string }>> {
  return Sentry.withServerActionInstrumentation(
    'createCategory',
    { headers: await headers() },
    async (): Promise<ActionResult<{ id: string }>> => {
      try {
        await requireAdmin();
      } catch {
        return { success: false, error: 'Unauthorized' };
      }

      const parsed = categoryFormSchema.safeParse(formData);
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
        const maxSort = await prisma.category.aggregate({
          _max: { sortOrder: true },
        });
        const sortOrder = (maxSort._max.sortOrder ?? 0) + 1;

        const category = await prisma.category.create({
          data: {
            name: parsed.data.name,
            slug,
            description: parsed.data.description || null,
            sortOrder,
          },
        });

        revalidateCategoryRoutes();
        return { success: true, data: { id: category.id } };
      } catch (error) {
        return describePrismaError(error, 'Failed to create category.');
      }
    },
  );
}

export async function updateCategory(
  categoryId: string,
  formData: Record<string, unknown>,
): Promise<ActionResult> {
  return Sentry.withServerActionInstrumentation(
    'updateCategory',
    { headers: await headers() },
    async (): Promise<ActionResult> => {
      try {
        await requireAdmin();
      } catch {
        return { success: false, error: 'Unauthorized' };
      }

      const parsed = categoryFormSchema.safeParse(formData);
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
        await prisma.category.update({
          where: { id: categoryId },
          data: {
            name: parsed.data.name,
            slug,
            description: parsed.data.description || null,
          },
        });
        revalidateCategoryRoutes();
        return { success: true, data: undefined };
      } catch (error) {
        return describePrismaError(error, 'Failed to update category.');
      }
    },
  );
}

export async function setCategoryActive(
  categoryId: string,
  isActive: boolean,
): Promise<ActionResult> {
  return Sentry.withServerActionInstrumentation(
    'setCategoryActive',
    { headers: await headers() },
    async (): Promise<ActionResult> => {
      try {
        await requireAdmin();
      } catch {
        return { success: false, error: 'Unauthorized' };
      }

      try {
        await prisma.category.update({
          where: { id: categoryId },
          data: { isActive },
        });
        revalidateCategoryRoutes();
        return { success: true, data: undefined };
      } catch (error) {
        return describePrismaError(error, 'Failed to update category status.');
      }
    },
  );
}

/**
 * Delete a category. Refuses if any products still reference it — the
 * admin must first reassign those products to another category. This
 * matches the Postgres FK behavior (Product.categoryId is non-null).
 */
export async function deleteCategory(
  categoryId: string,
): Promise<ActionResult> {
  return Sentry.withServerActionInstrumentation(
    'deleteCategory',
    { headers: await headers() },
    async (): Promise<ActionResult> => {
      try {
        await requireAdmin();
      } catch {
        return { success: false, error: 'Unauthorized' };
      }

      try {
        const productCount = await prisma.product.count({
          where: { categoryId },
        });
        if (productCount > 0) {
          return {
            success: false,
            error: `Category has ${productCount} product${productCount === 1 ? '' : 's'}. Reassign them before deleting.`,
          };
        }
        await prisma.category.delete({ where: { id: categoryId } });
        revalidateCategoryRoutes();
        return { success: true, data: undefined };
      } catch (error) {
        return describePrismaError(error, 'Failed to delete category.');
      }
    },
  );
}

/**
 * Re-order categories based on the admin-supplied id list. The array
 * position is written back as each row's sortOrder. Single transaction
 * so the list is never briefly inconsistent.
 */
export async function reorderCategories(
  orderedIds: string[],
): Promise<ActionResult> {
  return Sentry.withServerActionInstrumentation(
    'reorderCategories',
    { headers: await headers() },
    async (): Promise<ActionResult> => {
      try {
        await requireAdmin();
      } catch {
        return { success: false, error: 'Unauthorized' };
      }

      const parsed = categoryReorderSchema.safeParse({ orderedIds });
      if (!parsed.success) {
        return { success: false, error: 'Invalid order payload.' };
      }

      try {
        await prisma.$transaction(
          parsed.data.orderedIds.map((id, index) =>
            prisma.category.update({
              where: { id },
              data: { sortOrder: index },
            }),
          ),
        );
        revalidateCategoryRoutes();
        return { success: true, data: undefined };
      } catch (error) {
        return describePrismaError(error, 'Failed to reorder categories.');
      }
    },
  );
}
