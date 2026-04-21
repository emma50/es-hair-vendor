import { TableSkeleton } from '@/components/skeletons/AdminSkeletons';

export default function AdminProductsLoading() {
  return <TableSkeleton rows={5} cols={6} />;
}
