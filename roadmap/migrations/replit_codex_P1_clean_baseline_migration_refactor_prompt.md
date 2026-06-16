# Replit/Codex Prompt — AuraPoS Clean Baseline Migration Refactor

Repository: `Rndynt/AuraPoS`

## Objective

Rebuild the AuraPoS migration history into a clean development baseline. The app is still in development, so there is no production data migration requirement. The migration chain must be easy to read, deterministic on a fresh database, and ordered by dependency level.

Use the same style as `Rndynt/northflow-payment-orchestration`: clear names, domain/table priority, complete table definitions at creation time, and no drift/repair migration pattern.

## Hard Rules

1. Move every current root SQL migration into `migrations/backup/`.
2. Create a new active SQL chain in `migrations/` root.
3. Do not create `ensure_*`, `repair_*`, drift, or compatibility migrations.
4. Do not build the schema by adding columns later. Put every final column, default, index, unique index, and FK into the correct table creation migration.
5. Do not change UI, route, entitlement, POS, KDS, or CFD behavior in this task.
6. Use current code and schema files as source of truth. Do not guess table fields.
7. Keep the migration runner fail-fast for real missing table/relation errors.

## Required Audit

Before changing files, inspect:

- `packages/infrastructure/db/schema/*.schema.ts`
- active API routes/services using raw SQL
- all current `migrations/*.sql`
- existing schema audit docs

Explicitly verify these runtime tables:

- `kds_devices`
- `cfd_devices`
- `terminals`
- `sync_batches`
- `sync_events`
- `server_sync_conflicts`

Important finding to preserve:

- Existing CFD migration already creates `cfd_devices`; fold it into the clean CFD/display migration.
- Existing KDS hardening migration only modifies `kds_devices`; it assumes the table exists. In the clean baseline, create `kds_devices` explicitly in the KDS migration if current KDS routes use it.

## New Active Migration Chain

Create a clean chain similar to this:

```txt
0000_extensions.sql
0001_business_types.sql
0002_tenants.sql
0003_outlets.sql
0004_catalog.sql
0005_seating.sql
0006_order_types.sql
0007_orders.sql
0008_inventory.sql
0009_kitchen_kds.sql
0010_cfd_sync.sql
0011_seed_business_types.sql
0012_seed_order_types.sql
```

Adjust numbering only if the audit proves a better dependency order.

## Expected Table Grouping

`0000_extensions.sql`
- required PostgreSQL extensions such as `pgcrypto`.

`0001_business_types.sql`
- `business_types`.

`0002_tenants.sql`
- `tenants`.
- `tenant_entitlements`.
- any active tenant config table still used by current code.

`0003_outlets.sql`
- `outlets`.
- `user_outlet_assignments`.

`0004_catalog.sql`
- `product_categories`.
- `products`.
- `outlet_product_configs`.
- `product_option_groups`.
- `product_options`.

`0005_seating.sql`
- `tables`.

`0006_order_types.sql`
- `order_types`.
- `tenant_order_types`.
- `order_number_sequences`.

`0007_orders.sql`
- `orders`.
- `order_items`.
- `order_item_modifiers`.
- `order_payments`.
- payment sessions or split bill tables only if current code uses them.

`0008_inventory.sql`
- `inventory_movements`.
- `inventory_sync_errors`.

`0009_kitchen_kds.sql`
- `kitchen_tickets`.
- `kds_devices` with all columns needed by current KDS routes and the old KDS hardening migration.

`0010_cfd_sync.sql`
- `terminals`.
- `sync_batches`.
- `sync_events`.
- `server_sync_conflicts`.
- `cfd_devices` with all columns from the existing CFD token migration and current CFD routes.

`0011_seed_business_types.sql`
- idempotent seed for all supported business types.

`0012_seed_order_types.sql`
- idempotent seed for `DINE_IN`, `TAKE_AWAY`, `DELIVERY`, `WALK_IN`, and any current active app order type.

## Completeness Checklist

Fold all final fields and indexes from old migration files into the correct clean migration. Pay special attention to:

- outlet references;
- payment status and paid amount fields;
- idempotency keys;
- source terminal and local order identifiers;
- inventory movement reference fields;
- KDS activation code, expiry, attempts, lock, status, API key, and last seen fields;
- CFD API key, status, activated, last seen, and revoked fields;
- unique indexes and partial unique indexes.

## Migration Runner

Check `apps/api/src/migrations/migrationRunner.ts`.

It must not mark missing table/relation errors as already applied. Missing table errors should stop the migration so broken baselines are visible during development.

## Report

Create:

```txt
roadmap/migrations/clean_baseline_migration_refactor_report.md
```

The report must include:

1. final active migration file list;
2. backup migration file list;
3. dependency order rationale;
4. table inventory with key columns, FKs, indexes, and unique indexes;
5. old migration changes and where each one was folded;
6. KDS and CFD table source analysis;
7. validation result;
8. remaining issues if any.

## Validation

Run type checks for root, API, and terminal web. Then test against a clean development database. Expected result: all new migrations apply in order with zero errors, and no runtime log contains missing relation/table errors for CFD or KDS.

Smoke these endpoints/pages:

- `/api/me/entitlements`
- `/api/outlets`
- `/api/catalog/products`
- `/api/orders`
- `/api/cfd/session-token`
- `/api/kds/devices`
- `/api/kds/generate-code`

## Commit

Commit only migration cleanup, migration runner safety if needed, and migration report.

Commit message:

```txt
refactor(migrations): rebuild clean development baseline
```
