/**
 * Thin logging helpers for server-side code.
 *
 * Emits to stdout/stderr in every environment — Vercel routes those to
 * the function-logs view, which is the only way to know a webhook /
 * cron / server action quietly broke. Previously these were silenced
 * in production "to keep logs clean", which traded ops visibility for
 * a small reduction in noise — wrong trade for a payments-handling
 * app.
 *
 * If/when we wire a proper logger (pino, Sentry, etc.), swap the
 * implementation here and every call-site picks it up automatically.
 */

/** Log a recoverable server-side error. */
export function logServerError(label: string, error: unknown): void {
  console.error(`[${label}]`, error);
}

/** Log a warning-level server-side event. */
export function logServerWarn(label: string, error: unknown): void {
  console.warn(`[${label}]`, error);
}
