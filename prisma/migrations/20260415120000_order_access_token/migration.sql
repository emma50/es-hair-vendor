-- Add capability token column to Order.
-- Existing rows get a per-row random value so the NOT NULL + UNIQUE
-- constraints can be added in a single transaction without blocking
-- on a two-step migration. New rows are populated by the application
-- (see createOrder in src/app/actions/orders.ts).

-- pgcrypto provides gen_random_bytes(). It's not enabled by default
-- on a fresh Postgres / Supabase project (and it's not enabled on
-- Prisma's shadow database, which is what surfaced this in
-- `prisma migrate dev`). Enable it before the UPDATE below uses it.
-- IF NOT EXISTS keeps the migration idempotent against existing
-- environments where pgcrypto is already enabled.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- AlterTable
ALTER TABLE "Order"
  ADD COLUMN "accessToken" TEXT;

UPDATE "Order"
SET "accessToken" = encode(gen_random_bytes(32), 'base64')
WHERE "accessToken" IS NULL;

ALTER TABLE "Order"
  ALTER COLUMN "accessToken" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Order_accessToken_key" ON "Order"("accessToken");
