import { describe, it, expect } from 'vitest';

/**
 * Middleware logic tests — unit tests for the routing decisions in
 * `src/middleware.ts` without importing the Next.js middleware runtime.
 * Keep these helpers in sync with the real middleware implementation.
 */

const PUBLIC_ADMIN_ROUTES = [
  '/admin/login',
  '/admin/forgot-password',
  '/admin/reset-password',
];

function isProtectedPath(pathname: string): boolean {
  if (pathname.startsWith('/admin')) {
    return !PUBLIC_ADMIN_ROUTES.includes(pathname);
  }
  if (pathname.startsWith('/account')) return true;
  if (pathname === '/cart') return true;
  if (pathname.startsWith('/checkout')) return true;
  return false;
}

function buildLoginRedirect(pathname: string, baseUrl: string): string {
  const loginUrl = new URL('/auth/login', baseUrl);
  loginUrl.searchParams.set('redirect', pathname);
  return loginUrl.toString();
}

describe('middleware route protection logic', () => {
  describe('isProtectedPath', () => {
    it('does not protect public storefront routes', () => {
      expect(isProtectedPath('/')).toBe(false);
      expect(isProtectedPath('/products')).toBe(false);
      expect(isProtectedPath('/products/some-wig')).toBe(false);
    });

    it('protects /cart (cart is per-user, guests have nothing to view)', () => {
      expect(isProtectedPath('/cart')).toBe(true);
    });

    it('protects /checkout and all sub-paths', () => {
      expect(isProtectedPath('/checkout')).toBe(true);
      expect(isProtectedPath('/checkout/success')).toBe(true);
      expect(isProtectedPath('/checkout/cancel')).toBe(true);
    });

    it('does not protect /auth pages', () => {
      expect(isProtectedPath('/auth/login')).toBe(false);
      expect(isProtectedPath('/auth/signup')).toBe(false);
      expect(isProtectedPath('/auth/forgot-password')).toBe(false);
      expect(isProtectedPath('/auth/reset-password')).toBe(false);
    });

    it('does not protect legacy admin auth stubs', () => {
      expect(isProtectedPath('/admin/login')).toBe(false);
      expect(isProtectedPath('/admin/forgot-password')).toBe(false);
      expect(isProtectedPath('/admin/reset-password')).toBe(false);
    });

    it('protects the admin dashboard and sub-pages', () => {
      expect(isProtectedPath('/admin')).toBe(true);
      expect(isProtectedPath('/admin/products')).toBe(true);
      expect(isProtectedPath('/admin/orders')).toBe(true);
      expect(isProtectedPath('/admin/settings')).toBe(true);
      expect(isProtectedPath('/admin/categories')).toBe(true);
    });

    it('protects nested admin routes', () => {
      expect(isProtectedPath('/admin/products/new')).toBe(true);
      expect(isProtectedPath('/admin/orders/123')).toBe(true);
    });

    it('protects the customer account dashboard and sub-pages', () => {
      expect(isProtectedPath('/account')).toBe(true);
      expect(isProtectedPath('/account/orders')).toBe(true);
      expect(isProtectedPath('/account/orders/abc123')).toBe(true);
      expect(isProtectedPath('/account/profile')).toBe(true);
    });
  });

  describe('buildLoginRedirect', () => {
    const baseUrl = 'http://localhost:3000';

    it('redirects to /auth/login', () => {
      const url = buildLoginRedirect('/admin', baseUrl);
      expect(url).toContain('/auth/login');
    });

    it('includes redirect parameter', () => {
      const url = buildLoginRedirect('/admin/orders', baseUrl);
      expect(url).toContain('redirect=%2Fadmin%2Forders');
    });

    it('preserves the original admin path in redirect param', () => {
      const url = buildLoginRedirect('/admin/products/new', baseUrl);
      const parsed = new URL(url);
      expect(parsed.searchParams.get('redirect')).toBe('/admin/products/new');
    });

    it('preserves the original account path in redirect param', () => {
      const url = buildLoginRedirect('/account/orders', baseUrl);
      const parsed = new URL(url);
      expect(parsed.searchParams.get('redirect')).toBe('/account/orders');
    });
  });
});

describe('admin layout shell route matching', () => {
  const AUTH_ROUTES = [
    '/admin/login',
    '/admin/forgot-password',
    '/admin/reset-password',
  ];

  function isAuthRoute(pathname: string): boolean {
    return AUTH_ROUTES.includes(pathname);
  }

  it('identifies login as auth route', () => {
    expect(isAuthRoute('/admin/login')).toBe(true);
  });

  it('identifies forgot-password as auth route', () => {
    expect(isAuthRoute('/admin/forgot-password')).toBe(true);
  });

  it('identifies reset-password as auth route', () => {
    expect(isAuthRoute('/admin/reset-password')).toBe(true);
  });

  it('does not treat dashboard as auth route', () => {
    expect(isAuthRoute('/admin')).toBe(false);
  });

  it('does not treat admin sub-pages as auth routes', () => {
    expect(isAuthRoute('/admin/products')).toBe(false);
    expect(isAuthRoute('/admin/orders')).toBe(false);
    expect(isAuthRoute('/admin/settings')).toBe(false);
  });
});
