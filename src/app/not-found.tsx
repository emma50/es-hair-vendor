import Link from 'next/link';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <p className="font-display text-gold mb-4 text-8xl font-bold">404</p>
      <h1 className="font-display text-ivory mb-2 text-2xl font-semibold">
        Page Not Found
      </h1>
      <p className="text-silver mb-8 max-w-md text-sm leading-relaxed">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
        Try browsing our collection or head back to the home page.
      </p>
      <div className="flex items-center gap-3">
        <Link href="/">
          <Button>Back to Home</Button>
        </Link>
        <Link href="/products">
          <Button variant="ghost">
            <Search className="mr-1.5 h-4 w-4" />
            Browse Products
          </Button>
        </Link>
      </div>
    </div>
  );
}
