/**
 * Shared admin/CLI Prisma client.
 *
 * Used by `prisma/seed.ts` and the `scripts/dev-db/*` scripts — anywhere a
 * Node CLI process (tsx) needs to talk to Postgres outside of the Next.js
 * runtime. Centralises:
 *
 *   1. `.env.local` loading on top of `.env` (dotenv/config only handles .env)
 *   2. pg Pool + PrismaPg adapter wiring (Prisma 7 requires a driver adapter)
 *   3. A production safety guard so mutation scripts can't accidentally run
 *      against a production database
 *   4. A `disconnect()` helper to cleanly tear down the pool
 *
 * ⚠ This file imports `pg` and `@prisma/adapter-pg` and must NEVER be
 * imported from Next.js server components or route handlers — those use
 * `src/lib/prisma.ts` which is the runtime singleton for the app. Keeping
 * the two separate avoids pulling pg into the Next.js bundle and lets the
 * admin client add destructive-write protections the app client doesn't
 * need.
 */
import 'dotenv/config';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

// Load .env.local on top of .env (dotenv/config only loads .env).
dotenv.config({ path: '.env.local' });

// ── Production guard ─────────────────────────────────────────────
// CLI scripts that mutate data (seed, mock populate/update/delete) must
// refuse to run against anything that looks like a production database.
// Set DEV_DB_ALLOW_PROD=true to override, e.g. for a one-off prod seed.
const url = process.env.DATABASE_URL ?? '';
const looksLikeProd =
  process.env.NODE_ENV === 'production' ||
  /prod(uction)?/i.test(url) ||
  /\bprod\b/i.test(process.env.VERCEL_ENV ?? '');

if (looksLikeProd && process.env.DEV_DB_ALLOW_PROD !== 'true') {
  console.error(
    '\n❌  Refusing to run admin DB script against a production database.\n' +
      '    If you really mean to do this, set DEV_DB_ALLOW_PROD=true.\n',
  );
  process.exit(1);
}

if (!url) {
  console.error('❌  DATABASE_URL is not set. Check your .env.local.');
  process.exit(1);
}

// ── Prisma client ────────────────────────────────────────────────
const pool = new pg.Pool({ connectionString: url });
const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({ adapter });

/**
 * Disconnect the Prisma client and close the underlying pg pool cleanly.
 * Call from every CLI script's `.finally()` block to avoid leaving
 * connections hanging after the process exits.
 */
export async function disconnect(): Promise<void> {
  await prisma.$disconnect();
  await pool.end();
}
