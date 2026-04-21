import type { Metadata } from 'next';
import { CategoryForm } from './CategoryForm';
import { CategoryList } from './CategoryList';
import { getAdminCategories } from '@/lib/queries/categories';

export const metadata: Metadata = {
  title: 'Categories | Admin',
};

export default async function AdminCategoriesPage() {
  const categories = await getAdminCategories();

  return (
    <div>
      <h1 className="font-display text-ivory mb-6 text-2xl font-bold">
        Categories
      </h1>
      <CategoryForm />
      <div className="mt-8">
        <CategoryList categories={categories} />
      </div>
    </div>
  );
}
