import { Suspense } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Mail,
  Phone,
  MessageCircle,
  Sparkles,
  Star,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ProductCard } from '@/components/product/ProductCard';
import { ProductGrid } from '@/components/product/ProductGrid';
import { SocialProof } from '@/components/shared/SocialProof';
import { StructuredData } from '@/components/shared/StructuredData';
import { EmptyState } from '@/components/shared/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { getFeaturedProducts } from '@/lib/queries/products';
import { getCategoriesWithCounts } from '@/lib/queries/categories';
import { buildWhatsAppGreetingUrl } from '@/lib/whatsapp';
import { STORE_CONFIG, formatPhoneDisplay } from '@/lib/constants';

export const revalidate = 3600;

/**
 * Lazy-loaded collection section — fetches both categories and featured
 * products in parallel so we can decide in one place:
 *  - DB is empty → show a single EmptyState ("coming soon")
 *  - Only categories exist → show category tiles
 *  - Only featured products exist → show featured grid
 *  - Both exist → show both
 */
async function CollectionSection() {
  const [categories, featuredProducts] = await Promise.all([
    getCategoriesWithCounts(),
    getFeaturedProducts(8),
  ]);

  // Empty DB → use the shared EmptyState, not a blank page.
  if (categories.length === 0 && featuredProducts.length === 0) {
    return (
      <section className="mx-auto max-w-3xl px-4 py-24 sm:px-6 lg:px-8">
        <EmptyState
          icon={Sparkles}
          title="Our collection is coming soon"
          description="We're curating our premium hair collection right now. Reach out on WhatsApp and we'll personally walk you through what's available."
          actionLabel="Chat on WhatsApp"
          actionHref={
            STORE_CONFIG.whatsappNumber
              ? buildWhatsAppGreetingUrl(STORE_CONFIG.whatsappNumber)
              : '/products'
          }
        />
      </section>
    );
  }

  return (
    <>
      {categories.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
          <div className="mb-14 flex flex-col items-center text-center">
            <span className="mb-4 overline">Collection</span>
            <h2 className="font-display text-ivory text-[clamp(1.75rem,3.5vw,2.75rem)] leading-tight font-semibold tracking-tight">
              Shop by Category
            </h2>
            <p className="text-silver mt-3 max-w-md text-sm leading-relaxed">
              Curated by our team, crafted for every look &mdash; find exactly
              what you&apos;re searching for.
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {categories.map((cat, idx) => (
              <Link
                key={cat.id}
                href={`/products?category=${cat.slug}`}
                className="group border-slate/40 from-charcoal/80 via-graphite/60 to-charcoal/80 hover:border-gold/40 hover:shadow-card-hover relative overflow-hidden rounded-2xl border bg-gradient-to-br p-8 text-center backdrop-blur-sm transition-all duration-500 hover:-translate-y-1"
              >
                {/* Inner glow on hover */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(212,168,83,0.12),transparent_70%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                />
                <div className="relative flex flex-col items-center">
                  <span className="border-gold/20 bg-gold/5 text-gold group-hover:border-gold/50 group-hover:bg-gold/10 mb-5 inline-flex h-12 w-12 items-center justify-center rounded-full border text-[0.85rem] font-semibold transition-all duration-500">
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  <h3 className="text-ivory group-hover:text-gold font-display mb-1.5 text-lg font-semibold tracking-tight transition-colors">
                    {cat.name}
                  </h3>
                  <p className="text-muted text-xs tracking-[0.1em] uppercase">
                    {cat._count.products} Product
                    {cat._count.products !== 1 ? 's' : ''}
                  </p>
                  <ArrowRight className="text-gold/0 group-hover:text-gold mt-4 h-4 w-4 translate-y-1 opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100" />
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {featuredProducts.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
          <div className="mb-12 flex flex-col items-end justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <span className="mb-4 overline">Hand-picked</span>
              <h2 className="font-display text-ivory mt-4 text-[clamp(1.75rem,3.5vw,2.75rem)] leading-tight font-semibold tracking-tight">
                Featured Products
              </h2>
              <p className="text-silver mt-3 max-w-md text-sm leading-relaxed">
                Our most-loved styles, chosen by you &mdash; see what everyone
                is talking about.
              </p>
            </div>
            <Link
              href="/products"
              className="text-gold hover:text-gold-light group inline-flex items-center gap-1.5 text-xs font-semibold tracking-[0.14em] uppercase transition-colors"
            >
              View All
              <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </div>
          <ProductGrid>
            {featuredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </ProductGrid>
        </section>
      )}
    </>
  );
}

function SectionSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
      <Skeleton className="mb-12 h-9 w-56" />
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="aspect-[4/5] w-full rounded-2xl" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-5 w-1/3" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default async function HomePage() {
  const {
    whatsappNumber,
    appUrl,
    email: storeEmail,
    phone: storePhone,
  } = STORE_CONFIG;

  const orgSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Emmanuel Sarah Hair',
    url: appUrl,
    description:
      'Premium human hair bundles, closures, frontals, and wigs in Lagos, Nigeria.',
  };

  return (
    <>
      <StructuredData data={orgSchema} />

      {/* Hero — full-bleed cinematic opener. The layered gradients create a
          spotlight effect on the headline, and the radial champagne wash at
          the top gives the otherwise-black midnight a warm lift. */}
      <section className="relative flex min-h-[88vh] items-center justify-center overflow-hidden px-4 sm:px-6 lg:px-8">
        {/* Spotlight — warm champagne bloom behind headline */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_50%_35%,rgba(212,168,83,0.14),transparent_70%)]"
        />
        {/* Bottom vignette */}
        <div
          aria-hidden="true"
          className="from-midnight pointer-events-none absolute inset-x-0 bottom-0 h-60 bg-gradient-to-t to-transparent"
        />
        {/* Floating champagne orbs — decorative only */}
        <div
          aria-hidden="true"
          className="bg-gold/20 absolute top-1/4 left-[12%] h-1.5 w-1.5 rounded-full blur-[1px]"
          style={{ animation: 'float 7s ease-in-out infinite' }}
        />
        <div
          aria-hidden="true"
          className="bg-rose-gold/30 absolute top-1/3 right-[15%] h-1 w-1 rounded-full blur-[1px]"
          style={{ animation: 'float 9s ease-in-out infinite 1s' }}
        />
        <div
          aria-hidden="true"
          className="bg-champagne/20 absolute right-1/4 bottom-1/3 h-2 w-2 rounded-full blur-[2px]"
          style={{ animation: 'float 11s ease-in-out infinite 2s' }}
        />

        <div className="relative z-10 mx-auto max-w-3xl text-center">
          {/* Rating pill — social proof, sits above the eyebrow */}
          <div className="reveal border-gold/30 bg-gold/5 text-pearl mb-8 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-[0.7rem] font-medium tracking-wide backdrop-blur-sm">
            <span className="flex items-center gap-0.5">
              {[0, 1, 2, 3, 4].map((i) => (
                <Star
                  key={i}
                  className="text-gold h-3 w-3 fill-current"
                  aria-hidden="true"
                />
              ))}
            </span>
            <span className="text-silver">
              Trusted by hundreds across Nigeria
            </span>
          </div>
          <p className="reveal reveal-delay-1 mb-6 justify-center overline">
            Premium Human Hair
          </p>
          <h1 className="reveal reveal-delay-2 font-display text-ivory mb-6 text-[clamp(2.25rem,6vw,4.25rem)] leading-[1.05] font-bold tracking-tight">
            Luxury Hair,{' '}
            <span className="text-gradient-gold italic">Crafted</span> for You
          </h1>
          <p className="reveal reveal-delay-3 text-silver mx-auto mb-11 max-w-xl text-base leading-relaxed sm:text-lg">
            Curated bundles, closures, frontals, and wigs &mdash; ethically
            sourced and styled to perfection by our team in Lagos.
          </p>
          <div className="reveal reveal-delay-4 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link href="/products">
              <Button size="lg">
                Shop Collection
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            {whatsappNumber && (
              <a
                href={buildWhatsAppGreetingUrl(whatsappNumber)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="secondary" size="lg">
                  <MessageCircle className="h-4 w-4" />
                  Chat with us
                </Button>
              </a>
            )}
          </div>
        </div>

        {/* Scroll cue */}
        <div
          aria-hidden="true"
          className="absolute bottom-10 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 sm:flex"
        >
          <span className="text-muted text-[0.65rem] tracking-[0.25em] uppercase">
            Scroll
          </span>
          <div className="border-gold/30 flex h-9 w-[18px] items-start justify-center rounded-full border pt-1.5">
            <div
              className="bg-gold/60 h-1.5 w-0.5 rounded-full"
              style={{ animation: 'float 2s ease-in-out infinite' }}
            />
          </div>
        </div>
      </section>

      {/* Trust Signals — static, no data */}
      <SocialProof />

      {/* Collection (categories + featured) — lazy loaded, doesn't block hero paint.
          Renders the EmptyState when the DB is fully empty. */}
      <Suspense fallback={<SectionSkeleton count={8} />}>
        <CollectionSection />
      </Suspense>

      {/* Contact CTA — elevated, with gold glow */}
      <section className="relative mx-auto max-w-5xl px-4 py-24 sm:px-6 lg:px-8">
        <div className="border-slate/40 from-charcoal/80 via-graphite/40 to-charcoal/80 relative overflow-hidden rounded-3xl border bg-gradient-to-br p-10 text-center backdrop-blur-md sm:p-16">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_50%_0%,rgba(212,168,83,0.1),transparent_70%)]"
          />
          <div className="relative">
            <span className="mb-4 justify-center overline">Need Guidance?</span>
            <h2 className="font-display text-ivory mt-4 mb-4 text-[clamp(1.5rem,3vw,2.25rem)] font-semibold tracking-tight">
              Let us help you find your perfect look
            </h2>
            <p className="text-silver mx-auto mb-10 max-w-xl text-sm leading-relaxed sm:text-base">
              Reach out for personalized recommendations. Our team is here to
              walk you through every option and help you pick the hair
              you&apos;ll love.
            </p>
            <div className="mx-auto grid max-w-3xl gap-4 sm:grid-cols-3">
              {whatsappNumber && (
                <a
                  href={buildWhatsAppGreetingUrl(whatsappNumber)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group border-slate/40 bg-charcoal/60 hover:border-whatsapp/40 hover:bg-charcoal/80 flex flex-col items-center gap-3 rounded-2xl border p-6 transition-all duration-300"
                >
                  <div className="bg-whatsapp/10 text-whatsapp group-hover:bg-whatsapp/20 flex h-12 w-12 items-center justify-center rounded-full transition-all duration-300 group-hover:shadow-[0_0_24px_-4px_rgba(37,211,102,0.5)]">
                    <MessageCircle className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-ivory text-sm font-semibold tracking-wide">
                      WhatsApp
                    </p>
                    <p className="text-muted mt-0.5 text-[0.7rem] tracking-wide">
                      Chat instantly
                    </p>
                  </div>
                </a>
              )}
              <a
                href={`mailto:${storeEmail}`}
                className="group border-slate/40 bg-charcoal/60 hover:border-gold/40 hover:bg-charcoal/80 flex flex-col items-center gap-3 rounded-2xl border p-6 transition-all duration-300"
              >
                <div className="bg-gold/10 text-gold group-hover:bg-gold/20 group-hover:shadow-glow-sm flex h-12 w-12 items-center justify-center rounded-full transition-all duration-300">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-ivory text-sm font-semibold tracking-wide">
                    Email
                  </p>
                  <p className="text-muted mt-0.5 text-[0.7rem] tracking-wide break-all">
                    {storeEmail}
                  </p>
                </div>
              </a>
              <a
                href={`tel:${storePhone}`}
                className="group border-slate/40 bg-charcoal/60 hover:border-gold/40 hover:bg-charcoal/80 flex flex-col items-center gap-3 rounded-2xl border p-6 transition-all duration-300"
              >
                <div className="bg-gold/10 text-gold group-hover:bg-gold/20 group-hover:shadow-glow-sm flex h-12 w-12 items-center justify-center rounded-full transition-all duration-300">
                  <Phone className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-ivory text-sm font-semibold tracking-wide">
                    Call Us
                  </p>
                  <p className="text-muted mt-0.5 text-[0.7rem] tracking-wide">
                    {formatPhoneDisplay(storePhone)}
                  </p>
                </div>
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
