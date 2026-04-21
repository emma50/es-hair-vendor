import type { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';
import { safeList } from '@/lib/queries/safe';
import { STORE_CONFIG } from '@/lib/constants';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = STORE_CONFIG.appUrl;

  // safeList → a DB outage returns [] so sitemap.xml still renders the
  // static routes instead of crashing the crawler response.
  const products = await safeList(
    () =>
      prisma.product.findMany({
        where: { isActive: true },
        select: { slug: true, updatedAt: true },
      }),
    'sitemapProducts',
  );

  const productEntries: MetadataRoute.Sitemap = products.map((p) => ({
    url: `${baseUrl}/products/${p.slug}`,
    lastModified: p.updatedAt,
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/products`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    ...productEntries,
  ];
}
