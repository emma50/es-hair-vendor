import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { safeRedirectPath } from '@/lib/safe-redirect';

/**
 * OAuth / email-confirmation callback.
 *
 * Supabase email-verification and (future) social-login flows redirect
 * here with a `code` query param. We exchange that code for a session
 * cookie, then forward the browser onto the originally-requested
 * destination (or `/account` as a sensible default for customers).
 *
 * Security: the `?redirect=` param is attacker-controllable (it's
 * baked into the link we send in verification emails and a phish could
 * craft their own). `safeRedirectPath` enforces same-origin relative
 * paths so a crafted `?redirect=//evil.com` can't turn this route into
 * an open-redirect laundering primitive.
 */
export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get('code');
  const redirectTo =
    safeRedirectPath(searchParams.get('redirect')) ?? '/account';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${redirectTo}`);
    }
  }

  // Bad / expired code — bounce to login with a friendly state.
  return NextResponse.redirect(`${origin}/auth/login`);
}
