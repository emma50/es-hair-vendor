'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronDown,
  ChevronUp,
  Pencil,
  Check,
  X,
  Trash2,
  Eye,
  EyeOff,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import {
  updateCategory,
  deleteCategory,
  setCategoryActive,
  reorderCategories,
} from '@/app/actions/categories';

export interface CategoryRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isActive: boolean;
  sortOrder: number;
  _count: { products: number };
}

interface CategoryListProps {
  categories: CategoryRow[];
}

export function CategoryList({ categories: initial }: CategoryListProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  // Local optimistic order; commits to the server when the admin lifts
  // a reorder action (up/down arrow click).
  const [items, setItems] = useState<CategoryRow[]>(initial);
  // The category currently queued for deletion. `null` means the dialog
  // is closed — storing the whole row (not just an id) keeps the dialog
  // copy stable while the fade-out animation plays.
  const [pendingDelete, setPendingDelete] = useState<CategoryRow | null>(null);

  function beginEdit(cat: CategoryRow) {
    setEditingId(cat.id);
    setEditName(cat.name);
    setEditDescription(cat.description ?? '');
  }

  function cancelEdit() {
    setEditingId(null);
  }

  function saveEdit(id: string) {
    startTransition(async () => {
      const result = await updateCategory(id, {
        name: editName,
        description: editDescription,
      });
      if (!result.success) {
        toast(result.error, 'error');
        return;
      }
      toast('Category updated!', 'success');
      setEditingId(null);
      router.refresh();
    });
  }

  function toggleActive(cat: CategoryRow) {
    const nextActive = !cat.isActive;
    startTransition(async () => {
      const result = await setCategoryActive(cat.id, nextActive);
      if (!result.success) {
        toast(result.error, 'error');
        return;
      }
      toast(nextActive ? 'Category activated.' : 'Category hidden.', 'success');
      router.refresh();
    });
  }

  function handleDelete(cat: CategoryRow) {
    // Hard stop: deleting a category that still has products would
    // orphan those rows. Surface this via toast before ever opening
    // the dialog so the admin isn't lured into a confirm they can't
    // actually follow through on.
    if (cat._count.products > 0) {
      toast(
        `Category has ${cat._count.products} product${
          cat._count.products === 1 ? '' : 's'
        }. Reassign them before deleting.`,
        'error',
      );
      return;
    }
    setPendingDelete(cat);
  }

  function confirmDelete() {
    const cat = pendingDelete;
    if (!cat) return;
    startTransition(async () => {
      const result = await deleteCategory(cat.id);
      if (!result.success) {
        toast(result.error, 'error');
        setPendingDelete(null);
        return;
      }
      toast('Category deleted.', 'success');
      setPendingDelete(null);
      router.refresh();
    });
  }

  function move(id: string, direction: -1 | 1) {
    const idx = items.findIndex((c) => c.id === id);
    const target = idx + direction;
    if (idx < 0 || target < 0 || target >= items.length) return;
    const next = [...items];
    [next[idx], next[target]] = [next[target], next[idx]];
    setItems(next);
    startTransition(async () => {
      const result = await reorderCategories(next.map((c) => c.id));
      if (!result.success) {
        toast(result.error, 'error');
        // Roll back the optimistic reorder on failure.
        setItems(items);
        return;
      }
      router.refresh();
    });
  }

  const dialog = (
    <ConfirmDialog
      open={pendingDelete !== null}
      onCancel={() => {
        if (!isPending) setPendingDelete(null);
      }}
      onConfirm={confirmDelete}
      title={
        pendingDelete
          ? `Delete category "${pendingDelete.name}"?`
          : 'Delete category?'
      }
      description="This cannot be undone. The category will be permanently removed from your store."
      confirmLabel="Delete category"
      variant="destructive"
      isPending={isPending}
    />
  );

  if (items.length === 0) {
    return (
      <>
        <p className="text-muted py-10 text-center text-sm">
          No categories yet. Use the form above to create your first category.
        </p>
        {dialog}
      </>
    );
  }

  return (
    <>
      <ul className="space-y-3">
        {items.map((cat, index) => {
          const isEditing = editingId === cat.id;
          return (
            <li
              key={cat.id}
              className="border-slate bg-charcoal flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex flex-1 items-center gap-2">
                <div className="flex flex-col">
                  <button
                    type="button"
                    onClick={() => move(cat.id, -1)}
                    disabled={isPending || index === 0}
                    aria-label={`Move ${cat.name} up`}
                    className="text-silver hover:text-pearl disabled:opacity-30"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(cat.id, 1)}
                    disabled={isPending || index === items.length - 1}
                    aria-label={`Move ${cat.name} down`}
                    className="text-silver hover:text-pearl disabled:opacity-30"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                </div>
                {isEditing ? (
                  <div className="flex flex-1 flex-col gap-2 sm:flex-row">
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      aria-label="Category name"
                    />
                    <Input
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      placeholder="Description"
                      aria-label="Category description"
                    />
                  </div>
                ) : (
                  <div className="min-w-0">
                    <p className="text-pearl font-medium">{cat.name}</p>
                    {cat.description && (
                      <p className="text-muted truncate text-sm">
                        {cat.description}
                      </p>
                    )}
                  </div>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge>
                  {cat._count.products} product
                  {cat._count.products === 1 ? '' : 's'}
                </Badge>
                <Badge variant={cat.isActive ? 'success' : 'default'}>
                  {cat.isActive ? 'Active' : 'Hidden'}
                </Badge>
                {isEditing ? (
                  <>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => saveEdit(cat.id)}
                      disabled={isPending}
                      aria-label="Save category"
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={cancelEdit}
                      disabled={isPending}
                      aria-label="Cancel edit"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => beginEdit(cat)}
                      disabled={isPending}
                      aria-label={`Edit ${cat.name}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => toggleActive(cat)}
                      disabled={isPending}
                      aria-label={
                        cat.isActive ? `Hide ${cat.name}` : `Show ${cat.name}`
                      }
                    >
                      {cat.isActive ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(cat)}
                      disabled={isPending}
                      aria-label={`Delete ${cat.name}`}
                    >
                      <Trash2 className="text-error/80 h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      {dialog}
    </>
  );
}
