# Post-P8.4 Stock Basic Entitlement, Migration Recovery, and Policy Report

## Production cases

### Basic Starter stock page 403
- Root cause: Basic Stock / Stok Dasar is checked through `tenant_module_configs.enable_inventory`, but several onboarding paths and seed flows created free/basic tenants with `enable_inventory = false` even though the Marketplace/module catalog treats `enable_inventory` as a free module. This made `/api/inventory/products` fail before the P8.3 tracked-product listing query could run.
- Fix: All business-type onboarding templates and starter/demo seeds now enable Basic Stock by default while keeping `enable_inventory_advanced` and other paid modules disabled. A backfill migration (`0020_basic_stock_default_entitlement.sql`) enables `enable_inventory` for active `free`/`starter` tenants. The inventory route now uses explicit Basic vs Advanced entitlement helpers so the stock listing path remains gated by Basic Stock and movement/report paths remain gated by Advanced Inventory.
- Validation: Added tests for Basic Stock entitlement helper behavior, onboarding default module config, advanced-inventory separation, tracked product listing with no movement/zero stock, and full API test suite. No live production/staging tenant login was performed in this environment.

### Migration 0015 legacy tenant id failure
- Root cause: `0015_native_uuid_alignment.sql` previously asserted that `tenants.id` values were UUID-castable before changing column types. Production still contained a legacy slug id (`thamada`), so the assertion failed. The custom migration runner then logged the error but continued to later migrations, allowing `0019_inventory_movement_traceability.sql` to apply after a failed dependency.
- Fix: Migration 0015 now repairs legacy non-UUID `tenants.id` values after dropping old FKs and before UUID casts. It generates UUID tenant ids, preserves the legacy value in `tenants.slug`, updates tenant-owned `tenant_id` references in the same migration transaction, then proceeds to native UUID casting and FK restoration.
- Migration/runner changes: The migration runner was extracted into `apps/api/src/migrations/migrationRunner.ts`. It is fail-fast for real migration errors, stops before later migrations, logs `DB migrations failed` when errors are present, throws an actionable failure summary, and `index.ts` sets `process.exitCode = 1` when background migration execution fails.
- Validation: Added static migration repair tests and migration-runner failure semantics tests. `pnpm run db:check` passed. A live PostgreSQL fixture with a real `tenants.id = 'thamada'` row was not available in this environment.

## Stock policy

- Deduction timing: Tracked stock remains deducted on the first successful payment recording / quick-pay payment path; order creation or unpaid confirmation does not deduct stock.
- Partial payment behavior: First partial payment deducts stock once. Additional/final payment does not deduct again; idempotency replay prevents duplicate payment/stock movement.
- Cancel unpaid behavior: Cancelling an unpaid draft/confirmed order does not restore stock because no stock was deducted.
- Paid refund/void behavior: Separate refund/void endpoints are still not implemented. Existing paid/partial order cancellation restores stock for deducted lifecycle states; dedicated refund/void stock restoration remains a follow-up if those endpoints are added.
- Follow-up required: Add a dedicated production/staging migration rehearsal against a copy containing legacy slug ids, and design explicit refund/void stock restoration when refund/void endpoints are introduced.

## Tests

- Automated:
  - `apps/api/src/__tests__/inventory-entitlement.test.ts`
  - `apps/api/src/__tests__/inventory-stock-listing.test.ts`
  - `apps/api/src/__tests__/registration-service.test.ts`
  - `apps/api/src/__tests__/migration-runner.test.ts`
  - `apps/api/src/__tests__/native-uuid-migration-repair.test.ts`
  - `apps/api/src/__tests__/cancel-stock-policy.test.ts`
  - `apps/api/src/__tests__/create-and-pay-stock-concurrency.test.ts`
  - Full `@pos/api` test suite with `DATABASE_URL` and `BETTER_AUTH_SECRET` set to test values.
- Manual:
  - Not run against live local/staging browser data in this environment. Automated route/tenant isolation, entitlement, registration, migration-runner, stock-listing, idempotency, and stock-concurrency tests were run.

## Commands

- `pnpm check:boundaries`: pass
- `pnpm --filter @pos/domain type-check`: pass
- `pnpm --filter @pos/application type-check`: pass
- `pnpm --filter @pos/infrastructure type-check`: pass
- `pnpm --filter @pos/api type-check`: pass
- `pnpm --filter @pos/terminal-web type-check`: pass
- `pnpm type-check`: pass
- `pnpm run db:check`: pass
- `DATABASE_URL=postgres://user:pass@127.0.0.1:5432/aurapos_test BETTER_AUTH_SECRET=test-secret-with-at-least-32-characters pnpm --filter @pos/api test`: pass
- `DATABASE_URL=postgres://user:pass@127.0.0.1:5432/aurapos_test BETTER_AUTH_SECRET=test-secret-with-at-least-32-characters pnpm --dir apps/api exec tsx --test src/__tests__/registration-service.test.ts src/__tests__/inventory-stock-listing.test.ts src/__tests__/inventory-entitlement.test.ts src/__tests__/migration-runner.test.ts src/__tests__/native-uuid-migration-repair.test.ts src/__tests__/cancel-stock-policy.test.ts src/__tests__/create-and-pay-stock-concurrency.test.ts`: pass
- `pnpm --filter @pos/api test -- ...focused args`: failed because the package script still expanded `src/__tests__/**/*.test.ts`, and one pre-existing test imports DB-backed modules before its own fallback `DATABASE_URL` assignment when no shell `DATABASE_URL` is set. Re-run with shell `DATABASE_URL` passed.

## Final decision

- Basic Starter Stok Dasar default fixed: yes
- Stock page 403 fixed: yes for tenants with Stok Dasar active and for active free/starter tenants after migration 0020 backfill
- Tracked product visible for Basic Starter: yes, entitlement path fixed and P8.3 listing behavior remains covered
- Migration 0015 production failure handled: yes, repair added before UUID cast
- Migration runner fail-fast improved: yes
- Stock policy documented/enforced: yes
- Ready for next task: yes, with live staging/production rehearsal recommended
