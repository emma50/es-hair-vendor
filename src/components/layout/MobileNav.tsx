'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  X,
  UserCog,
  Home,
  ShoppingBag,
  ShoppingCart,
  MessageCircle,
} from 'lucide-react';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { STORE_CONFIG } from '@/lib/constants';
import { buildWhatsAppGreetingUrl } from '@/lib/whatsapp';

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
}

const navLinks = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/products', label: 'Shop Collection', icon: ShoppingBag },
  { href: '/cart', label: 'Cart', icon: ShoppingCart },
];

export function MobileNav({ isOpen, onClose }: MobileNavProps) {
  const navRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const { whatsappNumber } = STORE_CONFIG;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      {/* Backdrop — blur + dim */}
      <div
        className="absolute inset-0 animate-[fade-in_0.3s_ease-out] bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <nav
        ref={navRef}
        className="border-slate/40 bg-obsidian absolute top-0 left-0 flex h-full w-[320px] animate-[fade-up_0.35s_cubic-bezier(0.22,1,0.36,1)] flex-col border-r p-6 shadow-2xl"
        style={{
          backgroundImage:
            'radial-gradient(ellipse 100% 60% at 50% 0%, rgba(212,168,83,0.06), transparent 60%)',
        }}
        aria-label="Mobile navigation"
      >
        <div className="mb-10 flex items-center justify-between">
          <Link
            href="/"
            onClick={onClose}
            className="inline-flex items-center gap-2.5"
          >
            <span className="border-gold/30 from-gold-light/20 to-gold/5 inline-flex h-9 w-9 items-center justify-center rounded-full border bg-gradient-to-br">
              <span className="font-display text-gold text-sm font-bold">
                ES
              </span>
            </span>
            <span className="font-display text-ivory text-base leading-none font-semibold">
              Emmanuel Sarah
              <span className="text-gold/80 block text-[0.55rem] font-normal tracking-[0.3em] uppercase">
                Hair
              </span>
            </span>
          </Link>
          <button
            onClick={onClose}
            className="text-silver hover:text-ivory hover:bg-charcoal/60 rounded-lg p-2 transition-colors"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="divider-gold mb-6" />

        <ul className="flex-1 space-y-1">
          {navLinks.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                onClick={onClose}
                className="group text-pearl hover:text-gold hover:bg-charcoal/60 flex items-center gap-4 rounded-lg px-3 py-3.5 text-base transition-colors"
              >
                <link.icon className="text-gold/60 group-hover:text-gold h-5 w-5 transition-colors" />
                <span className="font-medium">{link.label}</span>
              </Link>
            </li>
          ))}
        </ul>

        {whatsappNumber && (
          <a
            href={buildWhatsAppGreetingUrl(whatsappNumber)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onClose}
            className="bg-whatsapp/10 border-whatsapp/30 text-whatsapp hover:bg-whatsapp/15 mb-5 flex items-center justify-center gap-2 rounded-lg border py-3 text-sm font-semibold tracking-wide transition-colors"
          >
            <MessageCircle className="h-4 w-4" />
            Chat on WhatsApp
          </a>
        )}

        {/* Theme toggle — inline segmented control so it stays inside the
            drawer bounds (the popover variant would clip on the right). */}
        <div className="mb-5">
          <p className="text-muted mb-2 text-[0.62rem] font-semibold tracking-[0.18em] uppercase">
            Appearance
          </p>
          <ThemeToggle variant="inline" className="w-full justify-between" />
        </div>

        <div className="border-slate/40 border-t pt-4">
          <Link
            href="/admin"
            onClick={onClose}
            className="text-muted hover:text-gold flex items-center gap-3 text-xs tracking-[0.1em] uppercase transition-colors"
          >
            <UserCog className="h-4 w-4" />
            Admin Dashboard
          </Link>
        </div>
      </nav>
    </div>
  );
}
