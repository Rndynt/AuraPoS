-- Payment Engine Phase 2 Hardening
-- Adds unique constraint to prevent duplicate allocations for the same
-- (payment_transaction_id, target_type, target_id) combination.
--
-- This acts as a schema-level safety net against concurrent
-- ConfirmFakeGatewayPayment calls that might both pass the FOR UPDATE
-- lock check and both attempt to insert an allocation for the same
-- confirmed transaction (e.g. across read replicas).
--
-- The application layer already prevents duplicates via
-- lockByProviderReferenceForUpdate(); this index is the last line of
-- defence and causes a unique-violation (42P07 / 23505) on the second
-- insert rather than silently writing duplicate rows.
--
-- Safe to re-run: IF NOT EXISTS prevents errors on already-migrated DBs.

CREATE UNIQUE INDEX IF NOT EXISTS "payment_allocations_tx_target_unique"
  ON "payment_allocations" ("payment_transaction_id", "target_type", "target_id");
