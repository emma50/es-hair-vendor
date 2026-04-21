/**
 * Thin logging helpers for server-side code.
 *
 * Why: spraying `console.error`/`console.warn` into production logs is
 * noisy — errors from expected user mistakes (validation, FK guards)
 * dominate useful signals. These helpers stay silent in production and
 * only emit in development, keeping server logs clean without losing
 * the local-debugging ergonomics.
 *
 * If/when we wire a proper logger (pino, Sentry, etc.), swap the
 * implementation here and every call-site picks it up automatically.
 */

const isDev = process.env.NODE_ENV !== 'production';

/** Log a recoverable server-side error in dev, silent in production. */
export function logServerError(label: string, error: unknown): void {
  if (!isDev) return;
  console.error(`[${label}]`, error);
}

/** Log a warning-level server-side event in dev, silent in production. */
export function logServerWarn(label: string, error: unknown): void {
  if (!isDev) return;
  console.warn(`[${label}]`, error);
}
