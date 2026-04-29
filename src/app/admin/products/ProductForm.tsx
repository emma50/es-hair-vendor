'use client';

import { useCallback, useState, useTransition } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ImagePlus,
  Star,
  StarOff,
  Trash2,
  ChevronUp,
  ChevronDown,
  Plus,
  X,
} from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import {
  createProduct,
  updateProduct,
  type ImageInput,
  type VariantInput,
} from '@/app/actions/products';
import type { SerializedProductWithRelations } from '@/lib/serialize';

// CldUploadWidget is a client-only dependency and heavyweight — load
// it lazily so the product form renders quickly without it and pulls
// in the bundle only when the admin clicks "Upload images".
const CldUploadWidget = dynamic(
  () => import('next-cloudinary').then((m) => m.CldUploadWidget),
  { ssr: false },
);

interface ProductFormProps {
  product?: SerializedProductWithRelations;
  categories: { value: string; label: string }[];
}

/** UI-side variant state: carries an id for existing rows, no id for new rows. */
type VariantRow = VariantInput & { key: string };
/** UI-side image state: carries an id for existing rows, no id for new ones. */
type ImageRow = ImageInput & { key: string };

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

interface CloudinaryUploadInfo {
  secure_url?: string;
  public_id?: string;
  width?: number;
  height?: number;
  original_filename?: string;
}

export function ProductForm({ product, categories }: ProductFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  // --- Category guard: admin can't create a product with zero categories.
  const noCategories = categories.length === 0;

  // --- Stale-category guard: if the product's stored categoryId is no
  // longer in the active options list, show the select with a greyed
  // "(archived)" placeholder so the admin can see they must pick
  // again rather than silently keeping the stale reference.
  const hasStaleCategory =
    !!product?.categoryId &&
    !categories.some((c) => c.value === product.categoryId);
  const selectOptions = hasStaleCategory
    ? [
        { value: product!.categoryId, label: '— archived category —' },
        ...categories,
      ]
    : categories;

  // --- Image state
  const [images, setImages] = useState<ImageRow[]>(() =>
    (product?.images ?? [])
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((img) => ({
        key: img.id,
        id: img.id,
        url: img.url,
        publicId: img.publicId,
        alt: img.alt || undefined,
        width: img.width || undefined,
        height: img.height || undefined,
        sortOrder: img.sortOrder,
        isPrimary: img.isPrimary,
      })),
  );

  const handleUploadSuccess = useCallback((result: unknown) => {
    const info = (result as { info?: CloudinaryUploadInfo } | null)?.info;
    if (!info?.secure_url || !info.public_id) return;
    setImages((prev) => {
      const hasPrimary = prev.some((p) => p.isPrimary);
      const next: ImageRow = {
        key: uid(),
        url: info.secure_url!,
        publicId: info.public_id!,
        alt: info.original_filename,
        width: info.width,
        height: info.height,
        sortOrder: prev.length,
        isPrimary: !hasPrimary, // first image becomes primary by default
      };
      return [...prev, next];
    });
  }, []);

  function removeImage(key: string) {
    setImages((prev) => {
      const next = prev
        .filter((i) => i.key !== key)
        .map((i, idx) => ({ ...i, sortOrder: idx }));
      // If the removed image was the primary and we have others, promote the first.
      const head = next[0];
      if (head && !next.some((i) => i.isPrimary)) {
        next[0] = { ...head, isPrimary: true };
      }
      return next;
    });
  }

  function markPrimary(key: string) {
    setImages((prev) => prev.map((i) => ({ ...i, isPrimary: i.key === key })));
  }

  function moveImage(key: string, direction: -1 | 1) {
    setImages((prev) => {
      const idx = prev.findIndex((i) => i.key === key);
      const target = idx + direction;
      if (idx < 0 || target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      const a = next[idx];
      const b = next[target];
      // Bounds checked above; narrowing for noUncheckedIndexedAccess.
      if (!a || !b) return prev;
      next[idx] = b;
      next[target] = a;
      return next.map((i, newIdx) => ({ ...i, sortOrder: newIdx }));
    });
  }

  // --- Variant state
  const [variants, setVariants] = useState<VariantRow[]>(() =>
    (product?.variants ?? []).map((v) => ({
      key: v.id,
      id: v.id,
      name: v.name,
      label: v.label,
      price: v.price,
      stockQuantity: v.stockQuantity,
      sku: v.sku || undefined,
    })),
  );

  function addVariant() {
    setVariants((prev) => [
      ...prev,
      {
        key: uid(),
        name: '',
        label: '',
        price: 0,
        stockQuantity: 0,
        sku: undefined,
      },
    ]);
  }

  function removeVariant(key: string) {
    setVariants((prev) => prev.filter((v) => v.key !== key));
  }

  function updateVariant<K extends keyof VariantRow>(
    key: string,
    field: K,
    value: VariantRow[K],
  ) {
    setVariants((prev) =>
      prev.map((v) => (v.key === key ? { ...v, [field]: value } : v)),
    );
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isPending) return;

    const form = new FormData(e.currentTarget);
    const formValues: Record<string, unknown> = {
      name: form.get('name'),
      description: form.get('description'),
      shortDescription: form.get('shortDescription'),
      categoryId: form.get('categoryId'),
      basePrice: form.get('basePrice'),
      compareAtPrice: form.get('compareAtPrice'),
      sku: form.get('sku'),
      stockQuantity: form.get('stockQuantity'),
      isActive: form.get('isActive') === 'on',
      isFeatured: form.get('isFeatured') === 'on',
      tags: form.get('tags'),
    };

    // --- Client-side guard: each variant must have non-empty name, label, price
    for (const v of variants) {
      if (!v.name.trim() || !v.label.trim() || !(v.price > 0)) {
        toast(
          'Every variant needs a name, label, and positive price.',
          'error',
        );
        return;
      }
    }

    // --- Client-side guard: exactly zero-or-one primary image
    const primaries = images.filter((i) => i.isPrimary).length;
    if (images.length > 0 && primaries === 0) {
      toast('Please mark one image as primary.', 'error');
      return;
    }
    if (primaries > 1) {
      toast('Only one image can be primary.', 'error');
      return;
    }

    const serializedImages: ImageInput[] = images.map((i) => ({
      id: i.id,
      url: i.url,
      publicId: i.publicId,
      alt: i.alt || undefined,
      width: i.width || undefined,
      height: i.height || undefined,
      sortOrder: i.sortOrder,
      isPrimary: i.isPrimary,
    }));
    const serializedVariants: VariantInput[] = variants.map((v) => ({
      id: v.id,
      name: v.name.trim(),
      label: v.label.trim(),
      price: Number(v.price),
      stockQuantity: Number(v.stockQuantity),
      sku: v.sku?.trim() || undefined,
    }));

    startTransition(async () => {
      setFieldErrors({});
      const result = product
        ? await updateProduct(
            product.id,
            formValues,
            serializedImages,
            serializedVariants,
          )
        : await createProduct(formValues, serializedImages, serializedVariants);

      if (!result.success) {
        toast(result.error, 'error');
        if (result.fieldErrors) setFieldErrors(result.fieldErrors);
        return;
      }

      toast(product ? 'Product updated!' : 'Product created!', 'success');
      router.push('/admin/products');
      router.refresh();
    });
  }

  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const hasCloudinary = !!cloudName;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <fieldset disabled={isPending} className="space-y-6 disabled:opacity-70">
        <div className="border-slate bg-charcoal rounded-lg border p-6">
          <h2 className="font-display text-ivory mb-4 text-lg font-semibold">
            General
          </h2>
          {noCategories && (
            <div className="border-warning/40 bg-warning/10 text-warning mb-4 rounded-md border p-3 text-sm">
              There are no active categories yet.{' '}
              <Link href="/admin/categories" className="underline">
                Create one first
              </Link>
              , then return here.
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              name="name"
              label="Product Name"
              defaultValue={product?.name}
              required
              error={fieldErrors.name?.[0]}
              className="sm:col-span-2"
            />
            <Textarea
              name="description"
              label="Description"
              defaultValue={product?.description}
              required
              error={fieldErrors.description?.[0]}
              className="sm:col-span-2"
            />
            <Input
              name="shortDescription"
              label="Short Description (SEO)"
              defaultValue={product?.shortDescription || ''}
              error={fieldErrors.shortDescription?.[0]}
              className="sm:col-span-2"
            />
            <Select
              name="categoryId"
              label="Category"
              options={selectOptions}
              defaultValue={product?.categoryId}
              required
              error={fieldErrors.categoryId?.[0]}
              placeholder={noCategories ? 'No categories' : 'Select category'}
            />
            <Input
              name="tags"
              label="Tags (comma separated)"
              defaultValue={product?.tags.join(', ')}
              error={fieldErrors.tags?.[0]}
              hint="Duplicate tags are removed automatically."
            />
          </div>
        </div>

        <div className="border-slate bg-charcoal rounded-lg border p-6">
          <h2 className="font-display text-ivory mb-4 text-lg font-semibold">
            Pricing & Inventory
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <Input
              name="basePrice"
              label="Price (₦)"
              type="number"
              step="0.01"
              min="0"
              defaultValue={product?.basePrice ?? ''}
              required
              error={fieldErrors.basePrice?.[0]}
            />
            <Input
              name="compareAtPrice"
              label="Compare-at Price (₦)"
              type="number"
              step="0.01"
              min="0"
              defaultValue={product?.compareAtPrice ?? ''}
              error={fieldErrors.compareAtPrice?.[0]}
            />
            <Input
              name="stockQuantity"
              label="Stock Quantity"
              type="number"
              min="0"
              defaultValue={product?.stockQuantity ?? 0}
              required
              error={fieldErrors.stockQuantity?.[0]}
            />
            <Input
              name="sku"
              label="SKU"
              defaultValue={product?.sku || ''}
              error={fieldErrors.sku?.[0]}
            />
          </div>
        </div>

        {/* --- IMAGES ------------------------------------------------ */}
        <div className="border-slate bg-charcoal rounded-lg border p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-ivory text-lg font-semibold">
              Images
            </h2>
            {hasCloudinary ? (
              <CldUploadWidget
                signatureEndpoint="/api/cloudinary/sign"
                uploadPreset={
                  process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET ?? undefined
                }
                options={{
                  multiple: true,
                  folder: 'eshair/products',
                  clientAllowedFormats: ['jpg', 'jpeg', 'png', 'webp', 'avif'],
                  maxFileSize: 10_000_000,
                  sources: ['local', 'url', 'camera'],
                }}
                onSuccess={handleUploadSuccess}
              >
                {({ open }) => (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => open?.()}
                  >
                    <ImagePlus className="h-4 w-4" /> Upload Images
                  </Button>
                )}
              </CldUploadWidget>
            ) : (
              <p className="text-muted text-xs">
                Cloudinary is not configured — image uploads disabled.
              </p>
            )}
          </div>

          {images.length === 0 ? (
            <p className="text-muted text-sm">
              No images yet. Click &quot;Upload Images&quot; to add product
              photos. The first image you upload becomes the primary image by
              default.
            </p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {images.map((img, index) => (
                <li
                  key={img.key}
                  className="border-slate bg-graphite relative overflow-hidden rounded-lg border"
                >
                  <div className="relative aspect-square">
                    <Image
                      src={img.url}
                      alt={img.alt || 'Product image'}
                      fill
                      sizes="(max-width:768px) 100vw, 240px"
                      className="object-cover"
                    />
                    {img.isPrimary && (
                      <span className="bg-gold text-midnight absolute top-2 left-2 rounded-md px-2 py-0.5 text-xs font-semibold">
                        Primary
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 p-2">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => moveImage(img.key, -1)}
                        disabled={index === 0}
                        aria-label="Move image up"
                        className="text-silver hover:text-pearl disabled:opacity-30"
                      >
                        <ChevronUp className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveImage(img.key, 1)}
                        disabled={index === images.length - 1}
                        aria-label="Move image down"
                        className="text-silver hover:text-pearl disabled:opacity-30"
                      >
                        <ChevronDown className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => markPrimary(img.key)}
                        aria-label={
                          img.isPrimary ? 'Primary image' : 'Make primary'
                        }
                        className={
                          img.isPrimary
                            ? 'text-gold'
                            : 'text-silver hover:text-gold'
                        }
                      >
                        {img.isPrimary ? (
                          <Star className="h-4 w-4 fill-current" />
                        ) : (
                          <StarOff className="h-4 w-4" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => removeImage(img.key)}
                        aria-label="Remove image"
                        className="text-error/80 hover:text-error"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* --- VARIANTS ---------------------------------------------- */}
        <div className="border-slate bg-charcoal rounded-lg border p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-ivory text-lg font-semibold">
              Variants
            </h2>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={addVariant}
            >
              <Plus className="h-4 w-4" /> Add Variant
            </Button>
          </div>
          {variants.length === 0 ? (
            <p className="text-muted text-sm">
              No variants. Use the base price and stock quantity above, or add
              variants for options like length, colour, or bundle size.
            </p>
          ) : (
            <ul className="space-y-3">
              {variants.map((v) => (
                <li
                  key={v.key}
                  className="border-slate bg-graphite/60 grid gap-3 rounded-md border p-3 sm:grid-cols-12"
                >
                  <Input
                    label="Name (internal)"
                    value={v.name}
                    onChange={(e) =>
                      updateVariant(v.key, 'name', e.target.value)
                    }
                    className="sm:col-span-3"
                  />
                  <Input
                    label="Display Label"
                    value={v.label}
                    onChange={(e) =>
                      updateVariant(v.key, 'label', e.target.value)
                    }
                    className="sm:col-span-3"
                  />
                  <Input
                    label="Price (₦)"
                    type="number"
                    step="0.01"
                    min="0"
                    value={v.price}
                    onChange={(e) =>
                      updateVariant(
                        v.key,
                        'price',
                        e.target.value === '' ? 0 : Number(e.target.value),
                      )
                    }
                    className="sm:col-span-2"
                  />
                  <Input
                    label="Stock"
                    type="number"
                    min="0"
                    value={v.stockQuantity}
                    onChange={(e) =>
                      updateVariant(
                        v.key,
                        'stockQuantity',
                        e.target.value === '' ? 0 : Number(e.target.value),
                      )
                    }
                    className="sm:col-span-2"
                  />
                  <Input
                    label="SKU"
                    value={v.sku ?? ''}
                    onChange={(e) =>
                      updateVariant(v.key, 'sku', e.target.value)
                    }
                    className="sm:col-span-1"
                  />
                  <div className="flex items-end justify-end sm:col-span-1">
                    <button
                      type="button"
                      onClick={() => removeVariant(v.key)}
                      aria-label="Remove variant"
                      className="text-error/80 hover:text-error mb-2"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border-slate bg-charcoal rounded-lg border p-6">
          <h2 className="font-display text-ivory mb-4 text-lg font-semibold">
            Status
          </h2>
          <div className="flex flex-wrap gap-6">
            <label className="text-pearl flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="isActive"
                defaultChecked={product?.isActive ?? false}
                className="border-slate bg-graphite rounded"
              />
              Active (visible on the storefront)
            </label>
            <label className="text-pearl flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="isFeatured"
                defaultChecked={product?.isFeatured ?? false}
                className="border-slate bg-graphite rounded"
              />
              Featured (appears on the homepage)
            </label>
          </div>
          {!product && (
            <p className="text-muted mt-3 text-xs">
              Tip: new products default to inactive so you can review and add
              images before making them public.
            </p>
          )}
        </div>
      </fieldset>
      <div className="flex gap-4">
        <Button type="submit" isLoading={isPending} disabled={noCategories}>
          {product ? 'Update Product' : 'Create Product'}
        </Button>
        <Link href="/admin/products">
          <Button type="button" variant="ghost" disabled={isPending}>
            Cancel
          </Button>
        </Link>
      </div>
    </form>
  );
}
