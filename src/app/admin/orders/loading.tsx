import { TableSkeleton } from '@/components/skeletons/AdminSkeletons';

export default function AdminOrdersLoading() {
  return <TableSkeleton rows={5} cols={6} />;
}
