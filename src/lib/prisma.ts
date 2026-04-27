import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

/**
 * Prisma client wired to a pg pool that's safe for Vercel serverless.
 *
 * Connection strategy:
 *   - `DATABASE_URL` MUST be Supabase's pooled URL (port 6543, with
 *     `?pgbouncer=true&connection_limit=1`). Without this, every
 *     serverless cold start creates a fresh pg.Pool and we exhaust
 *     Supabase's per-project connection cap under modest traffic.
 *   - `max: 1` on the pool is belt-and-braces: even if the URL is
 *     misconfigured, each warm worker holds at most one connection.
 *   - The client is cached on `globalThis` in EVERY environment (was
 *     dev-only before). On Vercel, lambdas can be reused across
 *     invocations and a fresh PrismaClient per call is wasted
 *     handshake time + connection churn.
 *   - `idleTimeoutMillis: 10s` lets pgbouncer reclaim sockets while
 *     the function is suspended.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      'DATABASE_URL is not set. Configure the Supabase POOLED connection ' +
        '(port 6543, ?pgbouncer=true&connection_limit=1) in your environment.',
    );
  }
  const pool = new pg.Pool({
    connectionString,
    max: 1,
    idleTimeoutMillis: 10_000,
  });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();
globalForPrisma.prisma = prisma;
