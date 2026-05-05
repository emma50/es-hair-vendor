'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { syncUser } from '@/lib/auth/sync-user';
import { requireUser } from '@/lib/auth/require-user';
import { prisma } from '@/lib/prisma';
import { checkRateLimit } from '@/lib/rate-limit';
import { logServerError } from '@/lib/log';
import * as Sentry from '@sentry/nextjs';
import { STORE_CONFIG } from '@/lib/constants';

/**
 * Build a stable rate-limit key part from an email.
 *
 * Rate limits keyed on an email are trivially bypassed when the
 * normalisation is inconsistent — `User@Example.com`, `user@example.com`,
 * and `café@example.com` (composed vs decomposed `é`) all hit the same
 * inbox but produce three different bucket keys. NFC + case-fold + trim
 * collapses those variants so the 3-per-10-min style limits actually
 * bind per address.
 */
function emailRateLimitKey(email: string): string {
  return email.trim().toLowerCase().normalize('NFC');
}
import {
  signInSchema,
  signUpSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  updatePasswordSchema,
} from '@/lib/validations';
import type { ActionResult } from '@/types';
import type { UserRole } from '@prisma/client';

/**
 * Build the absolute URL for email callbacks (reset-password confirm,
 * signup verification). Falls back to the request's origin header so
 * deploy previews on Vercel get a correct link without extra config.
 */
async function getSiteOrigin(): Promise<string> {
  // const envOrigin = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const appOrigin = STORE_CONFIG.appUrl
  if (appOrigin) return appOrigin.replace(/\/$/, '');
  
  const hdrs = await headers();
  const host = hdrs.get('x-forwarded-host') ?? hdrs.get('host');
  const proto = hdrs.get('x-forwarded-proto') ?? 'https';
  return host ? `${proto}://${host}` : 'http://localhost:3000';
}

// ─── Sign up (customer self-serve) ────────────────────────────────

export async function signUpCustomer(
  formData: Record<string, unknown>,
): Promise<ActionResult<{ needsEmailConfirmation: boolean }>> {
  return Sentry.withServerActionInstrumentation(
    'signUpCustomer',
    { headers: await headers() },
    async (): Promise<ActionResult<{ needsEmailConfirmation: boolean }>> => {
      const parsed = signUpSchema.safeParse(formData);
      if (!parsed.success) {
        return {
          success: false,
          error: 'Please check your form fields.',
          fieldErrors: parsed.error.flatten().fieldErrors,
        };
      }

      // Rate limit per address. Signups are the cheapest endpoint to
      // hammer (no password-verification cost), so we cap at 3 per hour.
      // A real user who mistyped once or twice has plenty of headroom;
      // abuse scripts creating spam accounts hit the wall quickly.
      const rlKey = emailRateLimitKey(parsed.data.email);
      const rl = await checkRateLimit({
        key: `signUp:${rlKey}`,
        max: 3,
        windowMs: 60 * 60 * 1000, // 1 hour
      });
      if (!rl.allowed) {
        const mins = Math.ceil(rl.retryAfterMs / 60000);
        return {
          success: false,
          error: `Too many signup attempts. Please try again in ${mins} minute${mins === 1 ? '' : 's'}.`,
        };
      }

      const supabase = await createClient();
      const origin = await getSiteOrigin();

      const { data, error } = await supabase.auth.signUp({
        email: parsed.data.email,
        password: parsed.data.password,
        options: {
          emailRedirectTo: `${origin}/auth/callback?redirect=/account`,
          data: { name: parsed.data.name },
        },
      });

      if (error) {
        // Supabase's error messages (notably "User already registered")
        // leak whether an email already has an account — a classic
        // enumeration primitive. Collapse every signup failure into the
        // same generic success shape so the response is indistinguishable
        // from a brand-new signup. Supabase silently no-ops the email
        // resend for an existing account, so the UX remains honest:
        // "check your inbox" whether or not the account is new.
        logServerError('signUp', error);
        return { success: true, data: { needsEmailConfirmation: true } };
      }

      // If Supabase has email confirmation enabled (default), `data.user`
      // is present but `data.session` is null until the user clicks the
      // verification email. We still create the Prisma row now so the
      // customer has a canonical identity record from the moment they
      // sign up — with role CUSTOMER forced (never ADMIN from this path).
      if (data.user) {
        await syncUser(data.user, {
          name: parsed.data.name,
          role: 'CUSTOMER',
        });
      }

      const needsEmailConfirmation = data.session === null;
      return { success: true, data: { needsEmailConfirmation } };
    },
  );
}

// ─── Sign in (shared — customer & admin) ──────────────────────────

export async function signIn(
  formData: Record<string, unknown>,
): Promise<ActionResult<{ role: UserRole; redirectTo: string }>> {
  return Sentry.withServerActionInstrumentation(
    'signIn',
    { headers: await headers() },
    async (): Promise<ActionResult<{ role: UserRole; redirectTo: string }>> => {
      const parsed = signInSchema.safeParse(formData);
      if (!parsed.success) {
        return {
          success: false,
          error: 'Please check your form fields.',
          fieldErrors: parsed.error.flatten().fieldErrors,
        };
      }

      // Per-address brute-force throttle. Supabase has an internal cap but
      // it's generous and per-IP, which distributed credential-stuffing
      // (thousands of IPs, one guess each) sails right past. Binding the
      // limit to the target email shrinks the attack window regardless of
      // attacker infrastructure — 5 tries per 15 min is enough for a
      // legitimate user who's forgotten their password but catches any
      // automated stuffing run.
      const rlKey = emailRateLimitKey(parsed.data.email);
      const rl = await checkRateLimit({
        key: `signIn:${rlKey}`,
        max: 5,
        windowMs: 15 * 60 * 1000, // 15 min
      });
      if (!rl.allowed) {
        const mins = Math.ceil(rl.retryAfterMs / 60000);
        return {
          success: false,
          error: `Too many sign-in attempts. Please try again in ${mins} minute${mins === 1 ? '' : 's'}.`,
        };
      }

      const supabase = await createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: parsed.data.email,
        password: parsed.data.password,
      });

      if (error) {
        // Supabase returns "Invalid login credentials" — deliberately
        // opaque so the response doesn't leak whether the email exists.
        return { success: false, error: 'Invalid email or password.' };
      }

      // Ensure a Prisma row exists — covers the edge case where the
      // Supabase user was created out of band (script, dashboard) before
      // the Prisma side was synced. Role defaults to CUSTOMER; existing
      // rows (including admins) are returned unchanged.
      const appUser = await syncUser(data.user);

      const redirectTo = appUser.role === 'ADMIN' ? '/admin' : '/account';
      return {
        success: true,
        data: { role: appUser.role, redirectTo },
      };
    },
  );
}

// ─── Sign out ─────────────────────────────────────────────────────

export async function signOut(): Promise<void> {
  await Sentry.withServerActionInstrumentation(
    'signOut',
    { headers: await headers() },
    async () => {
      const supabase = await createClient();
      await supabase.auth.signOut();
    },
  );
  // `redirect()` throws a NEXT_REDIRECT internally; keep it OUTSIDE the
  // Sentry wrapper so the framework's redirect signal isn't captured
  // as an "error" by the instrumentation.
  redirect('/auth/login');
}

// ─── Forgot password ──────────────────────────────────────────────

export async function requestPasswordReset(
  formData: Record<string, unknown>,
): Promise<ActionResult> {
  return Sentry.withServerActionInstrumentation(
    'requestPasswordReset',
    { headers: await headers() },
    async (): Promise<ActionResult> => {
      const parsed = forgotPasswordSchema.safeParse(formData);
      if (!parsed.success) {
        return {
          success: false,
          error: 'Please enter a valid email address.',
          fieldErrors: parsed.error.flatten().fieldErrors,
        };
      }

      // Keyed on the target email so an attacker can't mail-bomb a victim's
      // inbox by hammering this endpoint. Response is always the same
      // "check your inbox" shape whether we rate-limited or actually sent —
      // no enumeration leak even under throttling. We silently drop
      // over-limit calls rather than returning an error so the abuse signal
      // stays server-side and the UX for the real user is unchanged.
      const rlKey = emailRateLimitKey(parsed.data.email);
      const rl = await checkRateLimit({
        key: `passwordReset:${rlKey}`,
        max: 3,
        windowMs: 15 * 60 * 1000, // 15 min
      });
      if (!rl.allowed) {
        return { success: true, data: undefined };
      }

      const supabase = await createClient();
      const origin = await getSiteOrigin();

      // Supabase swallows "email not found" internally and always returns
      // success — that's the behaviour we want (no account enumeration).
      await supabase.auth.resetPasswordForEmail(parsed.data.email, {
        redirectTo: `${origin}/auth/reset-password`,
      });

      return { success: true, data: undefined };
    },
  );
}

// ─── Reset password (from email recovery link) ────────────────────

export async function resetPassword(
  formData: Record<string, unknown>,
): Promise<ActionResult> {
  return Sentry.withServerActionInstrumentation(
    'resetPassword',
    { headers: await headers() },
    async (): Promise<ActionResult> => {
      const parsed = resetPasswordSchema.safeParse(formData);
      if (!parsed.success) {
        return {
          success: false,
          error: 'Please check your form fields.',
          fieldErrors: parsed.error.flatten().fieldErrors,
        };
      }

      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        // The recovery link must be clicked first — it exchanges the token
        // for a session cookie. If we get here without a session, the link
        // expired or the cookie was blocked.
        return {
          success: false,
          error:
            'Your reset link is no longer valid. Please request a new password reset email.',
        };
      }

      const { error } = await supabase.auth.updateUser({
        password: parsed.data.password,
      });
      if (error) return { success: false, error: error.message };

      return { success: true, data: undefined };
    },
  );
}

// ─── Change password (authenticated /account/profile) ─────────────

export async function updatePassword(
  formData: Record<string, unknown>,
): Promise<ActionResult> {
  return Sentry.withServerActionInstrumentation(
    'updatePassword',
    { headers: await headers() },
    async (): Promise<ActionResult> => {
      const current = await requireUser().catch(() => null);
      if (!current) return { success: false, error: 'Unauthorized' };

      const parsed = updatePasswordSchema.safeParse(formData);
      if (!parsed.success) {
        return {
          success: false,
          error: 'Please check your form fields.',
          fieldErrors: parsed.error.flatten().fieldErrors,
        };
      }

      const supabase = await createClient();

      // Re-verify the current password before allowing the update.
      // Supabase doesn't expose a direct "verify password" endpoint, so we
      // trial-sign-in with the current credentials. This prevents a
      // session-hijack attack from rotating the password silently.
      const { error: reauthError } = await supabase.auth.signInWithPassword({
        email: current.email,
        password: parsed.data.currentPassword,
      });
      if (reauthError) {
        return {
          success: false,
          error: 'Current password is incorrect.',
          fieldErrors: { currentPassword: ['Current password is incorrect.'] },
        };
      }

      const { error } = await supabase.auth.updateUser({
        password: parsed.data.newPassword,
      });
      if (error) return { success: false, error: error.message };

      // Supabase invalidates every other refresh token when a password is
      // changed — the tab we're responding on keeps its session, but any
      // other signed-in session (second browser, forgotten phone, etc.)
      // will be forced to re-authenticate on its next refresh. Surface
      // this to the UI so the account-security page can reassure the user
      // that "my old device" has been logged out as a side effect.
      return {
        success: true,
        data: undefined,
        message:
          'Password updated. Any other devices signed into this account will be asked to sign in again.',
      };
    },
  );
}

// ─── Re-send email confirmation ───────────────────────────────────

export async function resendVerificationEmail(
  email: string,
): Promise<ActionResult> {
  return Sentry.withServerActionInstrumentation(
    'resendVerificationEmail',
    { headers: await headers() },
    async (): Promise<ActionResult> => {
      // Rate-limit per (normalised) email so a "resend" button spam can't
      // fire off dozens of verification mails and drain Supabase's email
      // quota or pester the address owner. Supabase has its own internal
      // throttle, but we want a friendly "please wait N seconds" message
      // rather than a vague server error from the provider.
      // NFC-normalise via the shared helper so Unicode variants
      // (composed vs decomposed é) collapse onto a single bucket and can't
      // sidestep the per-address quota.
      const normalisedEmail =
        typeof email === 'string' ? emailRateLimitKey(email) : '';
      if (!normalisedEmail) {
        return { success: false, error: 'Email is required.' };
      }

      const rl = await checkRateLimit({
        key: `resendVerify:${normalisedEmail}`,
        max: 3,
        windowMs: 10 * 60 * 1000, // 10 min
      });
      if (!rl.allowed) {
        const mins = Math.ceil(rl.retryAfterMs / 60000);
        return {
          success: false,
          error: `Too many verification emails requested. Please wait ${mins} minute${
            mins === 1 ? '' : 's'
          } before trying again.`,
        };
      }

      const supabase = await createClient();
      const origin = await getSiteOrigin();

      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: normalisedEmail,
        options: {
          emailRedirectTo: `${origin}/auth/callback?redirect=/account`,
        },
      });

      if (error) return { success: false, error: error.message };
      return { success: true, data: undefined };
    },
  );
}

// ─── Utility: fetch current user for client components ────────────
/**
 * Server action variant of getCurrentUser — exposed so client
 * components can query auth state without instantiating a Supabase
 * browser client. Returns a minimal, serializable shape.
 */
export async function getSessionSummary(): Promise<
  | { authenticated: false }
  | {
      authenticated: true;
      email: string;
      name: string | null;
      role: UserRole;
    }
> {
  return Sentry.withServerActionInstrumentation(
    'getSessionSummary',
    { headers: await headers() },
    async (): Promise<
      | { authenticated: false }
      | {
          authenticated: true;
          email: string;
          name: string | null;
          role: UserRole;
        }
    > => {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.email) return { authenticated: false };

      const appUser = await prisma.user.findUnique({
        where: { id: user.id },
      });
      if (!appUser) return { authenticated: false };

      return {
        authenticated: true,
        email: appUser.email,
        name: appUser.name,
        role: appUser.role,
      };
    },
  );
}
