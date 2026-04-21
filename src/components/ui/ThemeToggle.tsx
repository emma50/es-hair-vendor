'use client';

import { useEffect, useRef, useState } from 'react';
import { Sun, Moon, Monitor, Check } from 'lucide-react';
import { useTheme, type ThemePreference } from '@/lib/theme';
import { cn } from '@/lib/utils';

interface ThemeToggleProps {
  /**
   * Visual variant:
   *   - "icon"  → circular icon button that opens a small popover menu
   *               (default; used in the desktop header).
   *   - "inline" → horizontal segmented control, suitable for the mobile
   *               drawer where a popover would clip against the drawer
   *               edge.
   */
  variant?: 'icon' | 'inline';
  className?: string;
}

interface Option {
  value: ThemePreference;
  label: string;
  icon: typeof Sun;
}

const OPTIONS: Option[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
];

export function ThemeToggle({ variant = 'icon', className }: ThemeToggleProps) {
  const { preference, resolved, setPreference } = useTheme();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Only render the interactive control after hydration — before that, the
  // server rendered with no knowledge of the user's stored preference, so
  // any icon we picked would risk a hydration mismatch.
  useEffect(() => {
    setMounted(true);
  }, []);

  // Close the popover when clicking outside or pressing Escape.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (variant === 'inline') {
    return (
      <div
        role="radiogroup"
        aria-label="Theme"
        className={cn(
          'border-slate/60 bg-graphite/60 inline-flex items-center gap-0.5 rounded-full border p-0.5 backdrop-blur-sm',
          className,
        )}
      >
        {OPTIONS.map((opt) => {
          const active = preference === opt.value;
          const Icon = opt.icon;
          return (
            <button
              key={opt.value}
              role="radio"
              aria-checked={active}
              onClick={() => setPreference(opt.value)}
              className={cn(
                'relative flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[0.68rem] font-semibold tracking-wide uppercase transition-colors duration-300',
                active
                  ? 'bg-gold text-midnight shadow-[0_4px_14px_-4px_rgba(212,168,83,0.55)]'
                  : 'text-silver hover:text-ivory',
              )}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              {opt.label}
            </button>
          );
        })}
      </div>
    );
  }

  // Icon variant — show the icon matching the *resolved* theme so the
  // control always reflects what the user is currently looking at. Before
  // mount we render a neutral placeholder to avoid hydration flicker.
  const ResolvedIcon =
    preference === 'system' ? Monitor : resolved === 'light' ? Sun : Moon;

  return (
    <div ref={wrapperRef} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Change theme"
        aria-haspopup="menu"
        aria-expanded={open}
        className="text-silver hover:text-gold hover:bg-charcoal/60 relative inline-flex h-10 w-10 items-center justify-center rounded-lg transition-colors"
      >
        {mounted ? (
          <ResolvedIcon
            className="h-[18px] w-[18px] transition-transform duration-300"
            aria-hidden="true"
          />
        ) : (
          <Monitor
            className="h-[18px] w-[18px] opacity-50"
            aria-hidden="true"
          />
        )}
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Theme"
          className="border-slate/60 bg-obsidian/95 absolute right-0 z-50 mt-2 w-44 origin-top-right animate-[fade-up_0.25s_ease-out] overflow-hidden rounded-xl border shadow-[0_20px_48px_-24px_rgba(0,0,0,0.7)] backdrop-blur-xl"
        >
          <div className="border-slate/40 border-b px-3 py-2">
            <p className="text-muted text-[0.62rem] font-semibold tracking-[0.18em] uppercase">
              Appearance
            </p>
          </div>
          <ul className="p-1">
            {OPTIONS.map((opt) => {
              const active = preference === opt.value;
              const Icon = opt.icon;
              return (
                <li key={opt.value}>
                  <button
                    type="button"
                    role="menuitemradio"
                    aria-checked={active}
                    onClick={() => {
                      setPreference(opt.value);
                      setOpen(false);
                    }}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors',
                      active
                        ? 'bg-gold/10 text-gold'
                        : 'text-pearl hover:bg-charcoal/60 hover:text-ivory',
                    )}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    <span className="flex-1 font-medium">{opt.label}</span>
                    {active && (
                      <Check className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
