import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'bg-charcoal animate-pulse rounded-md motion-reduce:animate-none',
        className,
      )}
      aria-hidden="true"
    />
  );
}
