import { Spinner } from '@/components/ui/Spinner';

export default function StorefrontLoading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Spinner className="text-gold h-8 w-8" />
    </div>
  );
}
