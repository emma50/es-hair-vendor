-- Add stockReleased flag to Order for idempotent stock accounting.
-- Existing rows default to TRUE (stock was subtracted on creation).
-- Orders that were already CANCELLED or REFUNDED before this migration
-- are backfilled to FALSE so their items do not get double-credited if
-- the admin subsequently transitions them back out of a terminal state.

ALTER TABLE "Order"
  ADD COLUMN "stockReleased" BOOLEAN NOT NULL DEFAULT true;

UPDATE "Order"
  SET "stockReleased" = false
  WHERE "status" IN ('CANCELLED', 'REFUNDED');
