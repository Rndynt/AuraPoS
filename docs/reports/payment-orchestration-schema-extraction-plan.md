# Payment Orchestration Schema Extraction Plan

Date: 2026-06-05

## Current Location

Payment orchestration tables are currently declared in `shared/schema.ts` and created by `migrations/0022_payment_orchestration_standalone.sql`:

- `payment_orchestration_merchants`
- `payment_orchestration_provider_accounts`
- `payment_orchestration_intents`
- `payment_orchestration_transactions`
- `payment_orchestration_provider_events`
- `payment_orchestration_idempotency_keys`

This is acceptable inside the monorepo while AuraPoS and Northflow share one database schema package, but it is not sufficient for standalone extraction.

## Target Ownership

Move schema ownership to the standalone service/package boundary:

- Preferred package: `apps/payment-orchestration-service/src/infrastructure/schema.ts` while it remains an app.
- Future extracted package: `@northflow/payment-orchestration-db` or service-local `src/db/schema.ts` in the standalone repository.
- Repositories should import payment-orchestration tables from the standalone schema module, not from AuraPoS `shared/schema.ts`.

## Migration Ownership Plan

1. Copy current `payment_orchestration_*` Drizzle table definitions into the standalone schema module.
2. Keep column names and indexes byte-for-byte compatible initially.
3. Generate a no-op/verification migration from the standalone schema against an existing database to confirm parity.
4. Move future payment-orchestration migrations into standalone service migration ownership.
5. Leave AuraPoS root migrations with a compatibility migration marker while both live in the same monorepo.

## Drizzle Migration Generation Plan

1. Add standalone Drizzle config for payment orchestration only.
2. Point it at the standalone schema module.
3. Run migration generation against a disposable database initialized with `0022_payment_orchestration_standalone.sql`.
4. Confirm generated diff is empty; if not, reconcile type/default/index drift explicitly.
5. Generate future migrations from the standalone schema module only.

## Backward Compatibility Inside AuraPoS Monorepo

During transition:

- Keep `shared/schema.ts` exports stable for existing AuraPoS code and tests.
- Introduce a standalone schema module that re-exports or duplicates compatible table definitions only after parity is proven.
- Switch payment-orchestration repositories to the standalone schema module in a small isolated change.
- Do not remove root migration files until extraction simulation proves clean startup/migration flow.

## Risks

| Risk | Mitigation |
|---|---|
| Table definition drift between shared and standalone schema modules | Add schema mapper tests and a Drizzle diff check during transition. |
| Double migration ownership | Freeze AuraPoS root payment-orchestration migrations after handoff; future changes go through standalone migrations. |
| Existing tests importing root shared schema | Keep compatibility exports until tests and service repositories are migrated. |
| Foreign key/index mismatch | Compare generated SQL and run integration tests on disposable DB. |
| Extraction repo bootstrap misses existing production tables | Document baseline migration and provide idempotent bootstrap SQL. |

## Recommended Extraction Sequence

1. Create standalone schema module with current table definitions.
2. Add Drizzle config scoped only to payment orchestration.
3. Generate/diff migrations in a disposable database.
4. Switch service repositories from `shared/schema.ts` to standalone schema module.
5. Update docs and smoke commands to use standalone migration owner.
6. Run type-checks and payment-orchestration test suite.
7. Simulate extraction by copying `packages/payment-orchestration-core`, `packages/payment-orchestration-client-sdk`, and `apps/payment-orchestration-service` plus migrations into a clean workspace.
8. Remove temporary root shared-schema dependency only after extraction simulation passes.
