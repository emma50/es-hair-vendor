import 'server-only';

/**
 * Lightweight in-memory rate limiter.
 *
 * ┌──────────────────────────────────────────────────────────────────┐
 * │ LAUNCH-BLOCKER FOR HORIZONTALLY-SCALED PROD DEPLOYS              │
 * │                                                                  │
 * │ This limiter is per-process. On Vercel serverless / multiple     │
 * │ Node workers / a Docker fleet, each instance gets its own Map    │
 * │ and the effective ceiling becomes `configured × N_instances`.    │
 * │ A brute-force attacker can bypass caps simply by waiting for a   │
 * │ fresh cold worker.                                               │
 * │                                                                  │
 * │ BEFORE launching on any multi-instance host, swap the `buckets`  │
 * │ Map for an Upstash Redis / Vercel KV backend using `INCR` + a    │
 * │ sliding-window `EXPIRE`. Keep the `checkRateLimit` signature so  │
 * │ no call sites change.                                            │
 * └──────────────────────────────────────────────────────────────────┘
 *
 * Scope & limits:
 * - In-memory, per-process. See launch-blocker box above.
 * - Not persistent. A server restart clears every bucket, which is a
 *   feature for a development environment and an acceptable trade-off
 *   for low-stakes abuse-prevention (email resends, etc.).
 * - Keyed on whatever the caller provides. For anonymous endpoints
 *   pass the client IP; for authenticated endpoints use the user id.
 *   Email-keyed callers should NFC-normalise + lowercase the address
 *   before handing it over (see `emailRateLimitKey` in
 *   `src/app/actions/auth.ts`) — otherwise Unicode variants of the
 *   same address get independent buckets and the cap is bypassable.
 */

interface Bucket {
  /** Monotonically-increasing request count within the current window. */
  count: number;
  /** Timestamp (ms, from Date.now) of the first request in this window. */
  windowStart: number;
}

const buckets = new Map<string, Bucket>();

export interface RateLimitResult {
  /** `true` → request is allowed; `false` → blocked. */
  allowed: boolean;
  /** Milliseconds until the current window resets (0 when `allowed`). */
  retryAfterMs: number;
}

interface RateLimitOptions {
  /** Unique key for this bucket (e.g. `"resendVerify:user@example.com"`). */
  key: string;
  /** Max requests permitted per window. */
  max: number;
  /** Window size in milliseconds. */
  windowMs: number;
}

export function checkRateLimit({
  key,
  max,
  windowMs,
}: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now - bucket.windowStart >= windowMs) {
    // First request in a fresh window.
    buckets.set(key, { count: 1, windowStart: now });
    return { allowed: true, retryAfterMs: 0 };
  }

  if (bucket.count < max) {
    bucket.count += 1;
    return { allowed: true, retryAfterMs: 0 };
  }

  // Over the limit — caller should surface `retryAfterMs` to the user.
  return {
    allowed: false,
    retryAfterMs: windowMs - (now - bucket.windowStart),
  };
}

/**
 * Periodically evict expired buckets so the Map doesn't grow without
 * bound on a long-lived process. The overhead is one pass every 10
 * minutes, which is trivial compared to the memory churn of letting
 * stale keys accumulate.
 */
if (typeof setInterval === 'function') {
  const EVICT_INTERVAL_MS = 10 * 60 * 1000;
  setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets) {
      // If the window ended more than 10 min ago, nobody's coming back.
      if (now - bucket.windowStart > EVICT_INTERVAL_MS) {
        buckets.delete(key);
      }
    }
  }, EVICT_INTERVAL_MS).unref?.();
}
