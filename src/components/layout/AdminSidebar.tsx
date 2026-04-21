'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  FolderOpen,
  ShoppingCart,
  Settings,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { signOut } from '@/app/actions/auth';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/products', label: 'Products', icon: Package },
  { href: '/admin/categories', label: 'Categories', icon: FolderOpen },
  { href: '/admin/orders', label: 'Orders', icon: ShoppingCart },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="border-slate bg-charcoal flex w-64 shrink-0 flex-col border-r max-lg:w-16">
      <div className="border-slate flex h-16 items-center justify-center border-b px-4">
        <Link
          href="/admin"
          className="font-display text-gold text-lg font-bold max-lg:hidden"
        >
          ESHair Admin
        </Link>
        <Link
          href="/admin"
          className="font-display text-gold text-lg font-bold lg:hidden"
        >
          ES
        </Link>
      </div>
      <nav className="flex-1 space-y-1 p-2" aria-label="Admin navigation">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== '/admin' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-gold/10 text-gold'
                  : 'text-silver hover:bg-midnight hover:text-pearl',
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              <span className="max-lg:hidden">{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="border-slate space-y-2 border-t p-2">
        <div className="flex justify-center py-1 max-lg:hidden">
          <ThemeToggle />
        </div>
        {/*
          Sign-out is routed through the `signOut` server action so the
          Supabase session cookie is cleared server-side (not just in
          the browser client). The action then redirects to /auth/login.
        */}
        <form action={signOut}>
          <button
            type="submit"
            className="text-silver hover:bg-midnight hover:text-pearl flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            <span className="max-lg:hidden">Log Out</span>
          </button>
        </form>
      </div>
    </aside>
  );
}
