/**
 * Provision the admin user — in Supabase Auth AND in the Prisma User
 * table — in lockstep.
 *
 * Architecture:
 *   - Admin AUTHENTICATION lives in Supabase Auth (`auth.users`)
 *   - Admin IDENTITY for Prisma joins lives in `User`
 *   - `User.id` (UUID) === Supabase auth user id
 *
 * Usage:
 *   pnpm db:admin:provision
 *
 * Requires in `.env.local`:
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 *   ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME (optional, defaults to
 *   "Administrator")
 *
 * Idempotent — safe to run repeatedly. Re-running rotates the
 * password and heals stale Prisma rows.
 *
 * NOTE: dotenv loading and the production guard are handled by
 * `src/lib/db-admin.ts` (imported via `./client.ts`). That module
 * is evaluated before any top-level code here runs, so all env vars
 * from `.env` and `.env.local` are already available and the guard
 * has already fired.
 */
import { createClient } from '@supabase/supabase-js';
import { prisma, runScript } from './client';

// ── Required env ─────────────────────────────────────────────────
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_EMAIL = 'chioma@example.com';
const ADMIN_PASSWORD = "Correct-Horse-99";
const ADMIN_NAME = 'Administrator';

function fail(msg: string): never {
  console.error(`\n❌  ${msg}\n`);
  process.exit(1);
}

if (!SUPABASE_URL) fail('NEXT_PUBLIC_SUPABASE_URL is not set in .env.local');
if (!SERVICE_ROLE_KEY)
  fail('SUPABASE_SERVICE_ROLE_KEY is not set in .env.local');
if (!ADMIN_EMAIL) fail('ADMIN_EMAIL is not set in .env.local');
if (!ADMIN_PASSWORD) fail('ADMIN_PASSWORD is not set in .env.local');

// ── Service-role client (bypasses RLS, can manage auth.users) ────
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function findUserByEmail(email: string): Promise<{ id: string } | null> {
  const { data, error } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (error) fail(`Failed to list Supabase users: ${error.message}`);

  const match = data.users.find(
    (u) => u.email?.toLowerCase() === email.toLowerCase(),
  );
  return match ? { id: match.id } : null;
}

async function main(): Promise<void> {
  console.log('\n🔐 Provisioning admin in Supabase Auth...');

  const existing = await findUserByEmail(ADMIN_EMAIL!);
  let adminUserId: string;

  if (existing) {
    const { error } = await supabase.auth.admin.updateUserById(existing.id, {
      password: ADMIN_PASSWORD!,
      email_confirm: true,
      user_metadata: { role: 'admin', name: ADMIN_NAME },
    });
    if (error) fail(`Failed to update admin password: ${error.message}`);
    adminUserId = existing.id;
    console.log('  ✓ Existing admin found — password rotated');
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email: ADMIN_EMAIL!,
      password: ADMIN_PASSWORD!,
      email_confirm: true,
      user_metadata: { role: 'admin', name: ADMIN_NAME },
    });
    if (error || !data.user) {
      fail(
        `Failed to create admin user: ${error?.message ?? 'no user returned'}`,
      );
    }
    adminUserId = data.user!.id;
    console.log('  ✓ Admin user created in Supabase Auth');
  }

  // ── Mirror into Prisma ──────────────────────────────────────────
  console.log('🗃  Mirroring admin into Prisma User table...');
  await prisma.user.upsert({
    where: { id: adminUserId },
    update: { email: ADMIN_EMAIL!, name: ADMIN_NAME, role: 'ADMIN' },
    create: {
      id: adminUserId,
      email: ADMIN_EMAIL!,
      name: ADMIN_NAME,
      role: 'ADMIN',
    },
  });
  console.log('  ✓ Prisma User row upserted (role=ADMIN)');

  console.log(
    '\n✅ Done. Sign in at /auth/login and you will land on /admin.\n',
  );
}

runScript(main, 'provision');
