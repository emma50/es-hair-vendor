-- Add the DISPUTED label to OrderStatus.
--
-- Postgres requires `ALTER TYPE … ADD VALUE` to commit before the new
-- label is visible to subsequent statements. When this lives in the
-- same migration as DML / DDL that *uses* the new label, the deploy
-- fails with `unsafe use of new value of enum type`. Splitting the
-- enum mutation into its own migration ensures the COMMIT happens
-- before any later migration references the value.
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'DISPUTED';
