import 'server-only';
import { Redis } from '@upstash/redis';
import { logServerError } from '@/lib/log';

/**
 * Distributed rate limiter backed by Upstash Redis (the engine behind
 * Vercel KV), with an in-memory fallback for local dev.
 *
 * Algorithm — fixed-window counter:
 *   1. `INCR ratelimit:<key>` — atomic, returns the new count.
 *   2. If the result is `1`, this is the first request of a new window:
 *      `PEXPIRE ratelimit:<key> <windowMs>` to seed the TTL.
 *   3. If the count exceeds `max`, return `allowed: false` with the
 *      remaining TTL as `retryAfterMs`.
 *
 * Why fixed-window over sliding-window: two Redis round-trips per
 * request instead of three or four; the boundary-spike artefact (2×
 * burst across a window edge) is acceptable for the abuse classes we
 * care about (signup floods, password-reset spam, login brute force).
 *
 * Local dev fallback: when no Upstash / KV env vars are present we
 * fall through to an in-process `Map` so `pnpm dev` works without
 * spinning up a Redis instance. This is the SAME bypassable limiter
 * the warning yells about — it's only safe because dev isn't exposed
 * to attackers.
 *
 * Connecting on Vercel: when you provision Vercel KV (Storage → KV →
 * Connect) Vercel injects either `KV_REST_API_URL` + `KV_REST_API_TOKEN`
 * (legacy KV) or `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`
 * (Upstash integration). We support both.
 *
 * Keying: callers supply the bucket key. For email-keyed callers,
 * NFC-normalise + lowercase first (see `emailRateLimitKey` in
 * `src/app/actions/auth.ts`) so Unicode variants of the same address
 * share a bucket.
 */

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

const isTest =
  process.env.NODE_ENV === 'test' || process.env.VITEST === 'true';

/**
 * Resolve Redis connection params from either the legacy Vercel KV env
 * vars or the newer Upstash integration env vars. `null` means "no
 * Redis configured — fall back to in-memory."
 */
function resolveRedisEnv(): { url: string; token: string } | null {
  if (isTest) return null; // 🔥 force in-memory during tests
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  return { url, token };
}

const redisEnv = resolveRedisEnv();
const redis = redisEnv ? new Redis(redisEnv) : null;

const REDIS_KEY_PREFIX = 'ratelimit:';

export async function checkRateLimit({
  key,
  max,
  windowMs,
}: RateLimitOptions): Promise<RateLimitResult> {
  if (!redis) {
    return memoryCheck({ key, max, windowMs });
  }

  const redisKey = `${REDIS_KEY_PREFIX}${key}`;
  try {
    // INCR is atomic — multiple concurrent workers see a strictly
    // increasing sequence, which is what makes this safe across
    // serverless instances.
    const count = await redis.incr(redisKey);

    // First hit of a fresh window — set the TTL so the bucket expires
    // exactly windowMs from this first INCR. Subsequent INCRs in the
    // window inherit this TTL (no need to re-set).
    if (count === 1) {
      await redis.pexpire(redisKey, windowMs);
    }

    if (count <= max) {
      return { allowed: true, retryAfterMs: 0 };
    }

    // Over the cap — read the remaining TTL so we can tell the caller
    // how long until the window resets. PTTL returns -1 if the key has
    // no expiry (shouldn't happen post-step-2, but guard anyway) and -2
    // if the key has already expired between INCR and PTTL.
    const ttl = await redis.pttl(redisKey);
    const retryAfterMs = ttl > 0 ? ttl : windowMs;
    return { allowed: false, retryAfterMs };
  } catch (error) {
    // Redis is down. We deliberately FAIL OPEN: rate-limiting is
    // protection-in-depth, not the primary auth surface, and a Redis
    // outage shouldn't lock all users out of signup / password reset.
    // Log loudly so the outage shows up in monitoring.
    logServerError('rateLimit.redis', error);
    return { allowed: true, retryAfterMs: 0 };
  }
}

// ─── In-memory fallback (local dev only) ────────────────────────────

interface Bucket {
  count: number;
  windowStart: number;
}

const buckets = new Map<string, Bucket>();

/**
 * Test-only: clear every in-memory bucket. Flow tests in this repo
 * call the same rate-limited action many times in a single file
 * (admin sign-in, customer signup), and without a reset the per-window
 * cap trips on the 6th-ish call. Production code never imports this.
 */
export function _resetRateLimitForTests(): void {
  buckets.clear();
}

function memoryCheck({
  key,
  max,
  windowMs,
}: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now - bucket.windowStart >= windowMs) {
    buckets.set(key, { count: 1, windowStart: now });
    return { allowed: true, retryAfterMs: 0 };
  }

  if (bucket.count < max) {
    bucket.count += 1;
    return { allowed: true, retryAfterMs: 0 };
  }

  return {
    allowed: false,
    retryAfterMs: windowMs - (now - bucket.windowStart),
  };
}

/**
 * Periodic eviction for the in-memory fallback so it doesn't grow
 * without bound on a long-lived dev process.
 */
if (typeof setInterval === 'function' && !redis) {
  const EVICT_INTERVAL_MS = 10 * 60 * 1000;
  setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets) {
      if (now - bucket.windowStart > EVICT_INTERVAL_MS) {
        buckets.delete(key);
      }
    }
  }, EVICT_INTERVAL_MS).unref?.();
}

// Cold-start warning if we're on Vercel WITHOUT Redis provisioned —
// that's the dangerous configuration. Local dev doesn't trigger this.
if (process.env.VERCEL && !redis) {
  console.warn(
    '[rate-limit] Running on Vercel without Upstash/KV configured. Caps ' +
      'are per-worker and bypassable. Provision Vercel KV (Storage → ' +
      'KV → Connect) — UPSTASH_REDIS_REST_URL/_TOKEN or ' +
      'KV_REST_API_URL/_TOKEN are auto-injected on connect.',
  );
}
