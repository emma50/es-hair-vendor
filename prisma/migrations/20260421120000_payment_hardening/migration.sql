-- Payment-integration hardening: P1, P3, P8, P10 from the payment audit.
--
-- 1. DISPUTED order status — for Paystack chargeback flows.
-- 2. Unique index on Order.paymentReference — so a replayed or crafted
--    reference can never attach to a second order.
-- 3. Order.accessTokenExpiresAt — bounded lifetime on the anon
--    success-page capability token.
-- 4. Order.abandonedAt — populated by the PENDING-sweep cron.
-- 5. Order.paystackTransactionId — captured on first charge event so
--    refund calls have a stable target.
-- 6. (status, createdAt) composite index — lets the abandoned-order
--    sweeper find stale PENDING rows without a full scan.
-- 7. ProcessedWebhookEvent table — idempotency store for Paystack
--    webhook deliveries, keyed on the event id (at-least-once delivery).

-- ---------- 1. OrderStatus enum expansion ----------
-- Moved to its own migration (20260421115900_dispute_enum_value) so the
-- ALTER TYPE commits before this migration runs. `ALTER TYPE … ADD
-- VALUE` is unsafe to use in the same transaction as statements that
-- reference the new label.

-- ---------- 2-5. Order columns ----------
ALTER TABLE "Order"
  ADD COLUMN     "paystackTransactionId" TEXT,
  ADD COLUMN     "accessTokenExpiresAt"  TIMESTAMP(3),
  ADD COLUMN     "abandonedAt"           TIMESTAMP(3);

-- Unique index on paymentReference. PostgreSQL treats NULL as distinct
-- for uniqueness by default, so WHATSAPP-channel orders (which leave
-- the field NULL) do not collide. Matches Prisma's codegen for a
-- `String? @unique` field.
CREATE UNIQUE INDEX "Order_paymentReference_key"
  ON "Order" ("paymentReference");

-- ---------- 6. Composite index for the abandoned-order sweep ----------
CREATE INDEX "Order_status_createdAt_idx"
  ON "Order" ("status", "createdAt");

-- ---------- 7. Webhook-event dedup store ----------
CREATE TABLE "ProcessedWebhookEvent" (
  "id"              TEXT        NOT NULL,
  "paystackEventId" TEXT        NOT NULL,
  "eventType"       TEXT        NOT NULL,
  "processedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ProcessedWebhookEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProcessedWebhookEvent_paystackEventId_key"
  ON "ProcessedWebhookEvent" ("paystackEventId");
