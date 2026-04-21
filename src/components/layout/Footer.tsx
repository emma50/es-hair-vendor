import Link from 'next/link';
import {
  Instagram,
  Facebook,
  Mail,
  Phone,
  MapPin,
  MessageCircle,
  Clock,
} from 'lucide-react';
import { STORE_CONFIG, formatPhoneDisplay } from '@/lib/constants';
import { buildWhatsAppDirectUrl } from '@/lib/whatsapp';
import { getCategories } from '@/lib/queries/categories';

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15a6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.38a8.16 8.16 0 0 0 4.76 1.53V6.46a4.84 4.84 0 0 1-1-.23v.46Z" />
    </svg>
  );
}

export async function Footer() {
  const {
    email: storeEmail,
    phone: storePhone,
    address: storeAddress,
    whatsappNumber,
    instagramUrl,
    facebookUrl,
    tiktokUrl,
  } = STORE_CONFIG;
  const displayPhone = formatPhoneDisplay(storePhone);

  // Categories are driven by the DB. When the admin has no categories yet
  // the footer only shows "Shop All" + "Cart", never stale hardcoded links.
  const categories = await getCategories();

  return (
    <footer className="relative mt-16 overflow-hidden">
      {/* Top hairline gradient — visually separates the footer from content
          without the heavy border look. */}
      <div
        aria-hidden="true"
        className="via-gold/30 absolute top-0 left-0 h-px w-full bg-gradient-to-r from-transparent to-transparent"
      />

      {/* Ambient radial glow behind the newsletter card */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_100%,rgba(212,168,83,0.06),transparent_60%)]"
      />

      <div className="bg-obsidian/60 relative border-t border-transparent backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 pt-20 pb-10 sm:px-6 lg:px-8">
          <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-12">
            {/* Brand */}
            <div className="sm:col-span-2 lg:col-span-4">
              <div className="mb-5 inline-flex items-center gap-2.5">
                <span className="border-gold/30 from-gold-light/20 to-gold/5 inline-flex h-10 w-10 items-center justify-center rounded-full border bg-gradient-to-br">
                  <span className="font-display text-gold text-sm font-bold">
                    ES
                  </span>
                </span>
                <span className="font-display text-ivory text-xl leading-none font-semibold">
                  Emmanuel Sarah
                  <span className="text-gold/80 block text-[0.62rem] font-normal tracking-[0.3em] uppercase">
                    Hair
                  </span>
                </span>
              </div>
              <p className="text-silver mb-6 max-w-xs text-sm leading-relaxed">
                Premium human hair, delivered with love from Lagos, Nigeria.
                Ethically sourced, beautifully crafted, made to make you feel
                unforgettable.
              </p>
              {/* Social Icons */}
              <div className="flex gap-2.5">
                {instagramUrl && (
                  <a
                    href={instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="border-slate/50 text-silver hover:border-gold/50 hover:text-gold hover:bg-gold/5 rounded-full border p-2.5 transition-all duration-300"
                    aria-label="Follow us on Instagram"
                  >
                    <Instagram className="h-4 w-4" />
                  </a>
                )}
                {facebookUrl && (
                  <a
                    href={facebookUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="border-slate/50 text-silver hover:border-gold/50 hover:text-gold hover:bg-gold/5 rounded-full border p-2.5 transition-all duration-300"
                    aria-label="Follow us on Facebook"
                  >
                    <Facebook className="h-4 w-4" />
                  </a>
                )}
                {tiktokUrl && (
                  <a
                    href={tiktokUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="border-slate/50 text-silver hover:border-gold/50 hover:text-gold hover:bg-gold/5 rounded-full border p-2.5 transition-all duration-300"
                    aria-label="Follow us on TikTok"
                  >
                    <TikTokIcon className="h-4 w-4" />
                  </a>
                )}
                {whatsappNumber && (
                  <a
                    href={buildWhatsAppDirectUrl(whatsappNumber)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="border-slate/50 text-silver hover:border-whatsapp/50 hover:text-whatsapp hover:bg-whatsapp/5 rounded-full border p-2.5 transition-all duration-300"
                    aria-label="Chat with us on WhatsApp"
                  >
                    <MessageCircle className="h-4 w-4" />
                  </a>
                )}
              </div>
            </div>

            {/* Quick Links */}
            <div className="lg:col-span-2">
              <h4 className="text-gold mb-5 text-[0.68rem] font-semibold tracking-[0.22em] uppercase">
                Shop
              </h4>
              <ul className="space-y-3">
                <li>
                  <Link
                    href="/products"
                    className="text-silver hover:text-gold text-sm transition-colors"
                  >
                    All Products
                  </Link>
                </li>
                {categories.map((cat) => (
                  <li key={cat.slug}>
                    <Link
                      href={`/products?category=${cat.slug}`}
                      className="text-silver hover:text-gold text-sm transition-colors"
                    >
                      {cat.name}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link
                    href="/cart"
                    className="text-silver hover:text-gold text-sm transition-colors"
                  >
                    Cart
                  </Link>
                </li>
              </ul>
            </div>

            {/* Contact Us */}
            <div className="lg:col-span-3">
              <h4 className="text-gold mb-5 text-[0.68rem] font-semibold tracking-[0.22em] uppercase">
                Contact
              </h4>
              <ul className="space-y-3.5">
                <li>
                  <a
                    href={`mailto:${storeEmail}`}
                    className="group text-silver hover:text-gold flex items-start gap-3 text-sm transition-colors"
                  >
                    <Mail className="text-gold/70 group-hover:text-gold mt-0.5 h-4 w-4 shrink-0 transition-colors" />
                    <span className="break-all">{storeEmail}</span>
                  </a>
                </li>
                <li>
                  <a
                    href={`tel:${storePhone}`}
                    className="group text-silver hover:text-gold flex items-start gap-3 text-sm transition-colors"
                  >
                    <Phone className="text-gold/70 group-hover:text-gold mt-0.5 h-4 w-4 shrink-0 transition-colors" />
                    <span>{displayPhone}</span>
                  </a>
                </li>
                {whatsappNumber && (
                  <li>
                    <a
                      href={buildWhatsAppDirectUrl(whatsappNumber)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group text-silver hover:text-whatsapp flex items-start gap-3 text-sm transition-colors"
                    >
                      <MessageCircle className="text-whatsapp/70 group-hover:text-whatsapp mt-0.5 h-4 w-4 shrink-0 transition-colors" />
                      <span>Chat on WhatsApp</span>
                    </a>
                  </li>
                )}
                <li>
                  <div className="text-silver flex items-start gap-3 text-sm">
                    <MapPin className="text-gold/70 mt-0.5 h-4 w-4 shrink-0" />
                    <span>{storeAddress}</span>
                  </div>
                </li>
              </ul>
            </div>

            {/* Business Hours */}
            <div className="lg:col-span-3">
              <h4 className="text-gold mb-5 text-[0.68rem] font-semibold tracking-[0.22em] uppercase">
                Hours
              </h4>
              <ul className="space-y-3.5">
                <li className="flex items-start gap-3 text-sm">
                  <Clock className="text-gold/70 mt-0.5 h-4 w-4 shrink-0" />
                  <div>
                    <p className="text-pearl font-medium">Mon &ndash; Fri</p>
                    <p className="text-muted text-xs">
                      9:00 AM &ndash; 6:00 PM
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3 text-sm">
                  <Clock className="text-gold/70 mt-0.5 h-4 w-4 shrink-0" />
                  <div>
                    <p className="text-pearl font-medium">Saturday</p>
                    <p className="text-muted text-xs">
                      10:00 AM &ndash; 4:00 PM
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3 text-sm">
                  <Clock className="text-gold/70 mt-0.5 h-4 w-4 shrink-0" />
                  <div>
                    <p className="text-pearl font-medium">Sunday</p>
                    <p className="text-muted text-xs">Closed</p>
                  </div>
                </li>
              </ul>
            </div>
          </div>

          {/* Newsletter / WhatsApp CTA — elevated card */}
          <div className="border-gold/20 from-gold/[0.08] via-charcoal/40 mt-16 overflow-hidden rounded-2xl border bg-gradient-to-br to-transparent p-8 text-center backdrop-blur-sm lg:p-10">
            <div className="mb-3 justify-center overline">Stay Connected</div>
            <p className="font-display text-ivory mb-2 text-2xl font-semibold tracking-tight">
              Never miss a new arrival
            </p>
            <p className="text-silver mx-auto mb-6 max-w-lg text-sm leading-relaxed">
              Follow us on social media or send a message for exclusive offers,
              new arrivals, and insider hair care tips.
            </p>
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <a
                href={`mailto:${storeEmail}`}
                className="border-gold/40 bg-gold/10 text-gold hover:bg-gold/15 hover:border-gold/60 inline-flex items-center gap-2 rounded-full border px-6 py-3 text-xs font-semibold tracking-[0.14em] uppercase transition-all duration-300"
              >
                <Mail className="h-3.5 w-3.5" />
                Email Us
              </a>
              {whatsappNumber && (
                <a
                  href={buildWhatsAppDirectUrl(whatsappNumber)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-whatsapp hover:bg-whatsapp/90 inline-flex items-center gap-2 rounded-full px-6 py-3 text-xs font-semibold tracking-[0.14em] text-white uppercase shadow-[0_8px_24px_-8px_rgba(37,211,102,0.5)] transition-all duration-300 hover:shadow-[0_14px_32px_-8px_rgba(37,211,102,0.6)]"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  WhatsApp
                </a>
              )}
            </div>
          </div>

          {/* Bottom bar */}
          <div className="divider-gold mt-14 mb-8" />
          <div className="text-muted flex flex-col items-center justify-between gap-4 text-xs sm:flex-row">
            <span className="tracking-wide">
              &copy; {new Date().getFullYear()} Emmanuel Sarah Hair &middot;
              Crafted in Lagos
            </span>
            <div className="flex items-center gap-4 tracking-wide">
              <a
                href={`mailto:${storeEmail}`}
                className="hover:text-gold transition-colors"
              >
                {storeEmail}
              </a>
              <span className="text-slate/60">&bull;</span>
              <a
                href={`tel:${storePhone}`}
                className="hover:text-gold transition-colors"
              >
                {displayPhone}
              </a>
              <span className="text-slate/60">&bull;</span>
              <Link href="/admin" className="hover:text-gold transition-colors">
                Admin
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
