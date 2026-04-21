'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

/**
 * Theme system — light / dark / system
 *
 * Architecture
 * ------------
 * 1. The user's preference (the *choice*) is persisted in localStorage as
 *    one of: "light", "dark", "system". "system" is the default when no
 *    preference has ever been set.
 *
 * 2. The *resolved* theme (what is actually applied to the DOM) is either
 *    "light" or "dark" — if the preference is "system" we resolve it at
 *    runtime by reading `prefers-color-scheme` and keeping it in sync.
 *
 * 3. The resolved theme is written to `<html data-theme="...">`. All
 *    Tailwind utilities reference CSS custom properties that are
 *    overridden per theme in globals.css, so no component-level changes
 *    are ever required.
 *
 * 4. FOUC prevention is handled by `themeInitScript` (below), which is
 *    injected as a blocking <script> in the root layout BEFORE React
 *    hydrates. That script reads localStorage and applies the theme
 *    synchronously, so the first paint is already in the correct mode.
 *
 * 5. Changes within the same tab are broadcast via the "storage" and
 *    a custom "esh-theme" event so multiple tabs stay in sync.
 */

export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

const STORAGE_KEY = 'esh-theme';
const CHANGE_EVENT = 'esh-theme-change';

interface ThemeContextValue {
  /** User's explicit choice — may be "system". */
  preference: ThemePreference;
  /** Actual theme applied to the DOM (never "system"). */
  resolved: ResolvedTheme;
  /** Persist a new preference and apply it immediately. */
  setPreference: (next: ThemePreference) => void;
  /** Convenience: cycles light → dark → system → light. */
  cyclePreference: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readSystem(): ResolvedTheme {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: light)').matches
    ? 'light'
    : 'dark';
}

function readStoredPreference(): ThemePreference {
  if (typeof window === 'undefined') return 'system';
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    if (v === 'light' || v === 'dark' || v === 'system') return v;
  } catch {
    // localStorage can throw in privacy mode / iframes — fall through
  }
  return 'system';
}

function applyTheme(resolved: ResolvedTheme) {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.theme = resolved;
  document.documentElement.style.colorScheme = resolved;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Start from the same value the FOUC script applied, so the very first
  // React render matches the DOM and we avoid a hydration mismatch.
  const [preference, setPreferenceState] = useState<ThemePreference>(() => {
    if (typeof window === 'undefined') return 'system';
    return readStoredPreference();
  });

  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(() => {
    if (typeof window === 'undefined') return 'dark';
    return readSystem();
  });

  // Subscribe to `prefers-color-scheme` so "system" mode follows the OS live.
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    const onChange = (e: MediaQueryListEvent) =>
      setSystemTheme(e.matches ? 'light' : 'dark');
    // Safari < 14 used addListener — but we require modern browsers, so
    // addEventListener is fine.
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // Subscribe to cross-tab changes via the storage event.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        if (
          e.newValue === 'light' ||
          e.newValue === 'dark' ||
          e.newValue === 'system'
        ) {
          setPreferenceState(e.newValue);
        }
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const resolved: ResolvedTheme =
    preference === 'system' ? systemTheme : preference;

  // Apply whenever the resolved theme changes.
  useEffect(() => {
    applyTheme(resolved);
  }, [resolved]);

  const setPreference = useCallback((next: ThemePreference) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Ignore — we still update in-memory state below.
    }
    setPreferenceState(next);
    // Notify any other listeners in the same tab (storage events don't
    // fire for the tab that wrote them).
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: next }));
  }, []);

  const cyclePreference = useCallback(() => {
    setPreference(
      preference === 'light'
        ? 'dark'
        : preference === 'dark'
          ? 'system'
          : 'light',
    );
  }, [preference, setPreference]);

  const value = useMemo<ThemeContextValue>(
    () => ({ preference, resolved, setPreference, cyclePreference }),
    [preference, resolved, setPreference, cyclePreference],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within <ThemeProvider>');
  }
  return ctx;
}

/**
 * Blocking script injected via dangerouslySetInnerHTML into <head>. Runs
 * synchronously BEFORE first paint, so the user never sees a dark-mode
 * flash when their preference is light. Keep this string tiny and
 * dependency-free — it has to work without any runtime.
 *
 * Logic mirrors readStoredPreference() + readSystem() + applyTheme().
 */
export const themeInitScript = `
(function(){try{
  var k='${STORAGE_KEY}';
  var p=localStorage.getItem(k);
  if(p!=='light'&&p!=='dark'&&p!=='system')p='system';
  var r=p;
  if(p==='system'){
    r=window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';
  }
  var d=document.documentElement;
  d.setAttribute('data-theme',r);
  d.style.colorScheme=r;
}catch(e){
  document.documentElement.setAttribute('data-theme','dark');
}})();
`.trim();
