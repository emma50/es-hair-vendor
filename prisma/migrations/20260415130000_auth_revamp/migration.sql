-- Authentication revamp
--
-- * Drops User.password — credentials are owned by Supabase Auth only.
-- * Converts User.id from cuid TEXT to UUID so it matches Supabase's
--   auth.users.id. Any pre-existing User rows with non-UUID ids are
--   cleared; the admin row is re-created by `pnpm db:admin:provision`
--   after this migration lands.
-- * Adds User.name for display.
-- * Adds Order.userId → User(id) so signed-in customers can see their
--   own order history in /account/orders. NULL for guest checkouts.

-- 1. Drop existing User rows — the old cuid ids cannot be kept once the
--    column becomes UUID-typed. Admin + customers are re-provisioned
--    after migration via `db:admin:provision` and signup.
TRUNCATE TABLE "User" CASCADE;

-- 2. Reshape User:
ALTER TABLE "User" DROP COLUMN "password";
ALTER TABLE "User" ADD COLUMN "name" TEXT;
ALTER TABLE "User" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "id" TYPE UUID USING ("id"::uuid);

-- 3. Link Order to User (optional — preserves guest checkout).
ALTER TABLE "Order" ADD COLUMN "userId" UUID;

ALTER TABLE "Order"
  ADD CONSTRAINT "Order_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Order_userId_idx" ON "Order"("userId");
