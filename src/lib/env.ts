import 'server-only';
import { z } from 'zod';

/**
 * Boot-time environment validation.
 *
 * Why: a missing or malformed env var should fail loudly when the
 * server starts, NOT silently at the first request that tries to use
 * it. The previous behaviour ("define `process.env.X!` everywhere and
 * hope") collapses runtime errors into NPEs and 500s that only show up
 * for real users.
 *
 * What this catches:
 *   - DATABASE_URL missing or not a Postgres URL
 *   - Supabase URL / anon key missing
 *   - Paystack secret + public key out of sync (test vs live)
 *   - CRON_SECRET missing in production (cron sweep would never auth)
 *   - Cloudinary creds incomplete (admin uploads would 500)
 *
 * Behaviour:
 *   - In production: throws on import, kills the boot. Vercel surfaces
 *     this in the deploy logs immediately rather than at first request.
 *   - In development: logs a clear error and continues, so `pnpm dev`
 *     still boots without all env vars set (e.g. running just the
 *     storefront pages locally without Cloudinary configured).
 *   - In test: skipped entirely; flow tests stub their own env.
 */

const isTest = process.env.NODE_ENV === 'test' || process.env.VITEST === 'true';
const isProd = process.env.NODE_ENV === 'production';

const paystackKey = z
  .string()
  .min(1)
  .refine((v) => /^sk_(test|live)_/.test(v) || /^pk_(test|live)_/.test(v), {
    message: 'must start with sk_test_/sk_live_ or pk_test_/pk_live_',
  });

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).optional(),
    // ─── Database ──────────────────────────────────────────────────
    DATABASE_URL: z
      .string()
      .url()
      .refine(
        (v) => v.startsWith('postgres://') || v.startsWith('postgresql://'),
        {
          message: 'DATABASE_URL must be a postgres:// or postgresql:// URL',
        },
      ),
    DIRECT_URL: z
      .string()
      .url()
      .refine(
        (v) => v.startsWith('postgres://') || v.startsWith('postgresql://'),
        {
          message: 'DIRECT_URL must be a postgres:// or postgresql:// URL',
        },
      )
      .optional(),
    // ─── Supabase ──────────────────────────────────────────────────
    NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
    // ─── Paystack ──────────────────────────────────────────────────
    PAYSTACK_SECRET_KEY: paystackKey,
    NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY: paystackKey,
    // ─── Cloudinary ────────────────────────────────────────────────
    NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: z.string().min(1),
    NEXT_PUBLIC_CLOUDINARY_API_KEY: z.string().min(1),
    CLOUDINARY_API_SECRET: z.string().min(1),
    NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET: z.string().min(1).optional(),
    // ─── Cron ──────────────────────────────────────────────────────
    // Required in prod (otherwise the abandoned-order sweep can never
    // authenticate). Optional in dev so local boot doesn't require it.
    CRON_SECRET: z.string().min(32).optional(),
    // ─── Rate-limit (optional — falls back to in-memory) ───────────
    UPSTASH_REDIS_REST_URL: z.string().url().optional(),
    UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),
    KV_REST_API_URL: z.string().url().optional(),
    KV_REST_API_TOKEN: z.string().min(1).optional(),
    // ─── App ───────────────────────────────────────────────────────
    NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  })
  .superRefine((data, ctx) => {
    // Cross-field check: secret + public key must target the same env.
    const secretEnv = /^sk_test_/.test(data.PAYSTACK_SECRET_KEY)
      ? 'test'
      : 'live';
    const publicEnv = /^pk_test_/.test(data.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY)
      ? 'test'
      : 'live';
    if (secretEnv !== publicEnv) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Paystack key environment mismatch — secret=${secretEnv}, public=${publicEnv}. Charges will silently fail.`,
        path: ['PAYSTACK_SECRET_KEY'],
      });
    }
    // CRON_SECRET is required in production.
    if (isProd && !data.CRON_SECRET) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'CRON_SECRET is required in production. The abandoned-order sweep cannot authenticate without it.',
        path: ['CRON_SECRET'],
      });
    }
  });

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

export function env(): Env {
  if (cached) return cached;
  if (isTest) {
    // Tests stub envs locally; trust them.
    cached = process.env as unknown as Env;
    return cached;
  }

  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('\n');
    const message = `Invalid environment configuration:\n${issues}`;
    if (isProd) {
      // Boot-time crash — Vercel surfaces this in the deploy log.
      throw new Error(message);
    }
    // Dev: log loudly but keep going so the developer can iterate on
    // unrelated work without having to populate every env var.
    console.error(`\n[env] ${message}\n`);
    cached = process.env as unknown as Env;
    return cached;
  }
  cached = parsed.data;
  return cached;
}
