/**
 * safeQuery — a universal wrapper for server-side read queries.
 *
 * ## Why
 * Naked Prisma / fetch calls throw when the database is unreachable, the
 * table is missing, or the network blips. In server components those errors
 * propagate all the way up to `error.tsx`, replacing the entire page with a
 * generic error screen. That is the wrong default for READ operations —
 * missing or unreachable data should degrade to an empty state, not a crash.
 *
 * ## What
 * `safeQuery` executes an async reader, catches any thrown error, logs it in
 * development (silent in production), and returns a caller-supplied
 * `fallback` value. The fallback is typed as `T`, so the wrapper preserves
 * the original function signature from the caller's perspective.
 *
 * ## When NOT to use
 *   - Writes / mutations → use the `ActionResult` pattern instead. A failed
 *     write must surface its error to the user, not pretend it succeeded.
 *   - `getXBySlug` / existence checks that need to distinguish "not found"
 *     from "error" → the fallback collapses both to the same value, which is
 *     usually fine for the UI (both end in a 404 / empty state) but is the
 *     wrong tool if you need to retry on transient errors specifically.
 */

/**
 * Execute an async read and return either its result or the provided
 * fallback if it throws.
 *
 * @param fn       The async reader (usually a thunked Prisma call).
 * @param fallback A safe default to return on any error.
 * @param label    Optional short label used in dev-mode log output so you
 *                 can tell which query failed at a glance.
 */
export async function safeQuery<T>(
  fn: () => Promise<T>,
  fallback: T,
  label?: string,
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    // Logged in EVERY environment — silently swallowing read failures
    // in prod made DB outages indistinguishable from "no rows match"
    // and left admin pages mysteriously empty with no trace. Vercel
    // routes console.warn to the function-logs view.
    const message = error instanceof Error ? error.message : String(error);
    // Truncate so a Prisma stack dump doesn't hijack the terminal.
    const short = message.length > 300 ? `${message.slice(0, 300)}…` : message;
    console.warn(
      `[safeQuery${label ? `:${label}` : ''}] failed, returning fallback: ${short}`,
    );
    return fallback;
  }
}

/**
 * Variant for "find one" queries where the fallback is always `null`.
 * Saves repeating `null` at every call site.
 */
export async function safeFindOne<T>(
  fn: () => Promise<T | null>,
  label?: string,
): Promise<T | null> {
  return safeQuery(fn, null, label);
}

/**
 * Variant for list queries where the fallback is always an empty array.
 */
export async function safeList<T>(
  fn: () => Promise<T[]>,
  label?: string,
): Promise<T[]> {
  return safeQuery<T[]>(fn, [], label);
}
