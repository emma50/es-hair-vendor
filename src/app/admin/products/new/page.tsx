import type { Metadata } from 'next';
import { ProductForm } from '../ProductForm';
import { getCategoryOptions } from '@/lib/queries/categories';

export const metadata: Metadata = {
  title: 'New Product | Admin',
};

export default async function NewProductPage() {
  const categories = await getCategoryOptions();

  return (
    <div>
      <h1 className="font-display text-ivory mb-6 text-2xl font-bold">
        New Product
      </h1>
      <ProductForm
        categories={categories.map((c) => ({ value: c.id, label: c.name }))}
      />
    </div>
  );
}
