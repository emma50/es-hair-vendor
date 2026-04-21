'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Menu,
  UserCog,
  Search,
  UserCircle2,
  LogIn,
  LayoutDashboard,
  LogOut,
} from 'lucide-react';
import type { UserRole } from '@prisma/client';
import { CartIcon } from '@/components/cart/CartIcon';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { signOut } from '@/app/actions/auth';
import { MobileNav } from './MobileNav';

export interface HeaderSession {
  email: string;
  name: string | null;
  role: UserRole;
}

interface HeaderProps {
  /**
   * Resolved Supabase + Prisma session for the currently-signed-in
   * user, or `null` if anonymous. Passed from the server component
   * layout so the menu renders correctly on first paint (no client
   * flash of "Sign in" before an authed user resolves).
   */
  session: HeaderSession | null;
}

export function Header({ session }: HeaderProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Elevation-on-scroll — the header starts flush with the hero and gains
  // a stronger blur + border once the user scrolls into content. Keeps the
  // landing impression clean but still gives navigation visual anchoring
  // deeper on the page.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close the account dropdown on outside click / escape.
  useEffect(() => {
    if (!menuOpen) return;
    function onDocClick(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setMenuOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const initials = session?.name
    ? session.name
        .split(/\s+/)
        .map((p) => p[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : session?.email.slice(0, 2).toUpperCase();

  return (
    <header
      className={[
        'sticky top-0 z-40 transition-[background-color,border-color,backdrop-filter] duration-300',
        scrolled
          ? 'bg-midnight/80 border-slate/40 border-b backdrop-blur-xl backdrop-saturate-150'
          : 'border-b border-transparent bg-transparent',
      ].join(' ')}
    >
      <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left: Mobile hamburger + Logo */}
        <div className="flex items-center gap-3">
          <button
            className="text-pearl hover:text-gold hover:bg-charcoal/60 rounded-lg p-2 transition-colors lg:hidden"
            onClick={() => setMobileNavOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <Link
            href="/"
            aria-label="Emmanuel Sarah Hair — home"
            className="group inline-flex items-center gap-2.5"
          >
            <span className="border-gold/30 from-gold-light/20 to-gold/5 group-hover:border-gold/60 group-hover:shadow-glow-sm relative inline-flex h-9 w-9 items-center justify-center rounded-full border bg-gradient-to-br transition-all duration-300">
              <span className="font-display text-gold text-sm font-bold tracking-tight">
                ES
              </span>
            </span>
            <span className="font-display text-ivory hidden text-lg leading-none font-semibold tracking-tight sm:inline-block">
              Emmanuel Sarah
              <span className="text-gold/80 block text-[0.6rem] font-normal tracking-[0.3em] uppercase">
                Hair
              </span>
            </span>
          </Link>
        </div>

        {/* Center: Desktop nav */}
        <nav
          className="hidden items-center gap-10 lg:flex"
          aria-label="Main navigation"
        >
          <Link
            href="/"
            className="text-silver hover:text-gold relative text-[0.78rem] font-medium tracking-[0.14em] uppercase transition-colors duration-300 after:absolute after:-bottom-1.5 after:left-1/2 after:h-px after:w-0 after:-translate-x-1/2 after:bg-current after:transition-[width] after:duration-300 hover:after:w-full"
          >
            Home
          </Link>
          <Link
            href="/products"
            className="text-silver hover:text-gold relative text-[0.78rem] font-medium tracking-[0.14em] uppercase transition-colors duration-300 after:absolute after:-bottom-1.5 after:left-1/2 after:h-px after:w-0 after:-translate-x-1/2 after:bg-current after:transition-[width] after:duration-300 hover:after:w-full"
          >
            Shop
          </Link>
          {session && (
            <Link
              href="/cart"
              className="text-silver hover:text-gold relative text-[0.78rem] font-medium tracking-[0.14em] uppercase transition-colors duration-300 after:absolute after:-bottom-1.5 after:left-1/2 after:h-px after:w-0 after:-translate-x-1/2 after:bg-current after:transition-[width] after:duration-300 hover:after:w-full"
            >
              Cart
            </Link>
          )}
        </nav>

        {/* Right: Search + Theme + Account + Cart */}
        <div className="flex items-center gap-1">
          <Link
            href="/products"
            className="text-silver hover:text-gold hover:bg-charcoal/60 hidden rounded-lg p-2.5 transition-colors md:inline-flex"
            aria-label="Search products"
          >
            <Search className="h-[18px] w-[18px]" />
          </Link>
          <ThemeToggle />

          {/* Account menu — avatar if signed in, sign-in link if not */}
          {session ? (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                aria-label="Account menu"
                className="border-gold/40 text-gold hover:border-gold hover:shadow-glow-sm ml-1 inline-flex h-9 w-9 items-center justify-center rounded-full border text-xs font-semibold uppercase transition-all"
              >
                {initials || <UserCircle2 className="h-4 w-4" />}
              </button>
              {menuOpen && (
                <div
                  role="menu"
                  className="border-slate/60 bg-charcoal/95 shadow-card absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border backdrop-blur-xl"
                >
                  <div className="border-slate/50 border-b px-4 py-3">
                    <p className="text-pearl truncate text-sm font-medium">
                      {session.name ?? 'Signed in'}
                    </p>
                    <p className="text-muted truncate text-xs">
                      {session.email}
                    </p>
                  </div>
                  <div className="py-1 text-sm">
                    <Link
                      href="/account"
                      role="menuitem"
                      onClick={() => setMenuOpen(false)}
                      className="text-silver hover:bg-midnight hover:text-pearl flex items-center gap-2 px-4 py-2"
                    >
                      <UserCircle2 className="h-4 w-4" />
                      My account
                    </Link>
                    {session.role === 'ADMIN' && (
                      <Link
                        href="/admin"
                        role="menuitem"
                        onClick={() => setMenuOpen(false)}
                        className="text-silver hover:bg-midnight hover:text-pearl flex items-center gap-2 px-4 py-2"
                      >
                        <LayoutDashboard className="h-4 w-4" />
                        Admin dashboard
                      </Link>
                    )}
                    <form action={signOut}>
                      <button
                        type="submit"
                        role="menuitem"
                        className="text-silver hover:bg-midnight hover:text-pearl flex w-full items-center gap-2 px-4 py-2 text-left"
                      >
                        <LogOut className="h-4 w-4" />
                        Sign out
                      </button>
                    </form>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/auth/login"
              className="text-silver hover:text-gold hover:bg-charcoal/60 ml-1 inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium tracking-[0.12em] uppercase transition-colors"
              aria-label="Sign in"
            >
              <LogIn className="h-4 w-4" />
              <span className="hidden sm:inline">Sign in</span>
            </Link>
          )}

          {/* Admin shortcut for admins only — redundant with the menu
              but handy for power users who live in the dashboard. */}
          {session?.role === 'ADMIN' && (
            <Link
              href="/admin"
              className="text-silver hover:text-gold hover:bg-charcoal/60 hidden rounded-lg p-2.5 transition-colors sm:inline-flex"
              aria-label="Admin dashboard"
              title="Admin"
            >
              <UserCog className="h-[18px] w-[18px]" />
            </Link>
          )}
          {session && <CartIcon />}
        </div>
      </div>

      {/* Hairline gold divider at the very bottom — visible only when
          scrolled. Adds the "lifted" header feel without changing height. */}
      <div
        className={[
          'via-gold/30 pointer-events-none h-px w-full bg-gradient-to-r from-transparent to-transparent transition-opacity duration-300',
          scrolled ? 'opacity-100' : 'opacity-0',
        ].join(' ')}
      />

      <MobileNav
        isOpen={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
      />
    </header>
  );
}
