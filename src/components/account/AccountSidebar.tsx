'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Package, User, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { signOut } from '@/app/actions/auth';

interface AccountSidebarProps {
  name: string | null;
  email: string;
}

const navItems = [
  { href: '/account', label: 'Overview', icon: LayoutDashboard },
  { href: '/account/orders', label: 'My orders', icon: Package },
  { href: '/account/profile', label: 'Profile', icon: User },
];

export function AccountSidebar({ name, email }: AccountSidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="border-slate/60 bg-charcoal/60 shadow-card rounded-2xl border p-5 backdrop-blur-xl lg:sticky lg:top-24 lg:self-start">
      <div className="mb-5 flex items-center gap-3">
        <div className="border-gold/30 from-gold-light/20 to-gold/5 text-gold font-display flex h-11 w-11 items-center justify-center rounded-full border bg-gradient-to-br text-base font-semibold">
          {(name ?? email)[0]?.toUpperCase() ?? 'G'}
        </div>
        <div className="min-w-0">
          <p className="text-pearl truncate text-sm font-medium">
            {name ?? 'Your account'}
          </p>
          <p className="text-muted truncate text-xs">{email}</p>
        </div>
      </div>

      <nav className="space-y-1" aria-label="Account navigation">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== '/account' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-gold/10 text-gold'
                  : 'text-silver hover:bg-midnight hover:text-pearl',
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <form action={signOut} className="border-slate/50 mt-5 border-t pt-5">
        <button
          type="submit"
          className="text-silver hover:bg-midnight hover:text-pearl flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Sign out
        </button>
      </form>
    </aside>
  );
}
