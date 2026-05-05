import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

/**
 * Authentication middleware (Edge runtime).
 *
 * Protected scopes — anonymous visitors are redirected to
 * `/auth/login?redirect=<original path>` for all of these:
 *
 *   • `/admin/*`    — any authenticated user. Role check (ADMIN vs
 *                     CUSTOMER) happens in the admin layout via
 *                     `requireAdmin()` — Prisma can't run in Edge
 *                     runtime so the fine-grained check lives in Node.
 *   • `/account/*`  — any authenticated user.
 *   • `/cart`       — cart is per-user; guests have no cart to view.
 *   • `/checkout/*` — downstream of the cart, so also auth-only.
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

export async function middleware(req: NextRequest) {
  // Expose the current pathname and full path to downstream server
  // components via request headers. Layouts that need to build a
  // `?redirect=` param can read them via `headers()` without re-parsing
  // the URL (Next.js doesn't provide the pathname in server components
  // otherwise). Must be set on `req.headers` BEFORE Supabase clones
  // the request into its NextResponse.next({ request }) below.
  const pathWithSearch = `${req.nextUrl.pathname}${req.nextUrl.search}`;
  req.headers.set('x-pathname', req.nextUrl.pathname);
  req.headers.set('x-full-path', pathWithSearch);

  const { supabase, response } = updateSession(req);

  // Always call getUser() — even on public routes — so Supabase can
  // transparently refresh an expiring access token OR clear stale
  // cookies (e.g. after a dev-DB reset or revoked session). Without
  // this, the first server component to touch auth is the one that
  // throws "Invalid Refresh Token". Supabase's setAll callback will
  // write refreshed cookies onto the outgoing response here, which
  // is one of the few places cookies can legally be mutated.
  let user: Awaited<ReturnType<typeof supabase.auth.getUser>>['data']['user'] =
    null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch {
    // Stale / revoked refresh token — the cookie points at a session
    // the auth server no longer knows about (typical after a dev-DB
    // reset). Supabase's own cleanup is unreliable inside middleware,
    // so explicitly delete every `sb-*` auth cookie on BOTH the
    // incoming request (so downstream server components don't retry
    // the broken session) AND the outgoing response (so the browser
    // drops them).
    for (const cookie of req.cookies.getAll()) {
      if (cookie.name.startsWith('sb-')) {
        req.cookies.delete(cookie.name);
        response.cookies.delete(cookie.name);
      }
    }
  }

  if (isProtectedPath(req.nextUrl.pathname) && !user) {
    const loginUrl = new URL('/auth/login', req.url);
    loginUrl.searchParams.set(
      'redirect',
      `${req.nextUrl.pathname}${req.nextUrl.search}`,
    );
    return NextResponse.redirect(loginUrl);
  }

  if (user) {
    req.headers.set('x-user-id', user.id);
    req.headers.set('x-user-email', user.email as string);
  }

  return response;
}

export const config = {
  // Run on every route except Next.js internals and static assets.
  // Pattern lifted from the Supabase SSR Next.js template.
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
