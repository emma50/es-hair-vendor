import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { StructuredData } from './StructuredData';
import { STORE_CONFIG } from '@/lib/constants';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.label,
      ...(item.href && {
        item: `${STORE_CONFIG.appUrl}${item.href}`,
      }),
    })),
  };

  return (
    <nav aria-label="Breadcrumb" className="mb-6">
      <StructuredData data={jsonLd} />
      <ol className="text-silver flex flex-wrap items-center gap-1.5 text-sm">
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-1.5">
            {i > 0 && (
              <ChevronRight className="text-muted h-3.5 w-3.5" aria-hidden />
            )}
            {item.href && i < items.length - 1 ? (
              <Link
                href={item.href}
                className="hover:text-gold transition-colors"
              >
                {item.label}
              </Link>
            ) : (
              <span className="text-pearl" aria-current="page">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
