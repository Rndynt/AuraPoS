# AuraPoS Refactor — P7 S1-S3 Schema Boundary Cleanup Agent Prompt

You are working in the `Rndynt/AuraPoS` repository.

This prompt is the updated P7 prompt to use after P2, P3, P4, P5, and P6 have been implemented.

## Objective

Execute **P7 S1-S3 — Schema Boundary Cleanup** safely.

The goal is to move DB schema ownership toward infrastructure while keeping `shared/schema.ts` as a temporary compatibility boundary. This is a boundary cleanup/refactor, not a feature phase and not a database redesign.

Primary target areas:

```txt
shared/schema.ts
packages/infrastructure/db/schema/
packages/infrastructure/repositories/**
apps/api/**
```

## Current context

The root monorepo still has `shared/schema.ts` as a central Drizzle schema file.

P2/P3 removed application-layer DB/schema leaks. Application must remain schema-free.

P4 moved order workflow out of controllers.

P5 moved backend CFD/realtime logic into `apps/api/src/realtime/cfd`.

P6 moved frontend POS logic into `apps/pos-terminal-web/src/features/pos`.

P7 must not undo any of that.

## Read first

Read these files before editing:

```txt
roadmap/refactor/main.md
roadmap/refactor/execution-protocol.md
roadmap/refactor/p7-s1-s3-schema-boundary-cleanup.md
roadmap/refactor/p6-s1-s4-frontend-pos-feature-split.md
roadmap/refactor/p5-s1-s3-realtime-cfd-module-split.md
roadmap/refactor/p4-s1-s3-thin-controllers.md
roadmap/refactor/p3-s1-s3-unit-of-work-transaction-boundary.md
roadmap/refactor/p2-s1-s4-application-db-leak-removal.md

shared/schema.ts
packages/infrastructure/package.json
apps/api/src/container.ts
drizzle.config.ts
```

Then audit schema imports:

```bash
rg -n "from ['\"](@shared/schema|shared/schema|../../shared/schema|../../../shared/schema|.*shared/schema)['\"]" .
rg -n "@shared/schema|shared/schema" packages apps shared
```

## Strict scope

Work only on P7.

Do not start P8.

Do not add ESLint/import-boundary enforcement yet.

Do not touch frontend POS behavior.

Do not edit P6 POS feature flows unless a type-only import path update is absolutely necessary.

Do not edit P5 CFD behavior.

Do not edit P4 order workflow semantics.

Do not edit P3 UnitOfWork transaction semantics.

Do not edit payment business behavior.

Do not edit partial payment behavior.

Do not edit inventory behavior.

Do not add new feature tables.

Do not add branch/multi-location features.

Do not introduce hard FK dependencies from `orders` to restaurant-specific tables like tables/kitchen/down-payment.

Do not rename tables.

Do not rename columns.

Do not change constraints, indexes, defaults, enum-like varchar values, or references unless explicitly documented as an accidental mismatch fix.

Do not generate migrations unless a real schema change is intentionally required and approved.

The default expectation for P7 is **zero runtime DB schema changes**.

## P7 target shape

Create an infrastructure-owned schema folder:

```txt
packages/infrastructure/db/schema/
  auth.schema.ts
  tenants.schema.ts
  outlets.schema.ts
  catalog.schema.ts
  orders.schema.ts
  inventory.schema.ts
  kds.schema.ts
  cfd.schema.ts
  seating.schema.ts
  index.ts
```

Names may be adjusted if the current schema domains require it, but responsibility must be clear.

## Compatibility rule

Do not delete `shared/schema.ts`.

During P7, `shared/schema.ts` should remain a compatibility entry point. Prefer one of these safe strategies:

### Strategy A — Compatibility re-export wrapper

Move actual schema definitions into `packages/infrastructure/db/schema/*`, then make `shared/schema.ts` re-export from the new infrastructure schema index.

Use this only if import cycles and package resolution remain safe.

### Strategy B — Incremental mirrored modules

Create infrastructure schema modules that initially re-export selected symbols from `shared/schema.ts`, then migrate infrastructure imports toward the infrastructure path. Keep `shared/schema.ts` as source of truth temporarily.

Use this if full move is too risky for one batch.

### Strategy C — Hybrid staged split

Move low-risk, independent schema groups first and leave tightly coupled groups in `shared/schema.ts`, with explicit documentation.

Only use this if type-check and Drizzle config remain stable.

Pick the safest strategy based on actual code. Document the chosen strategy in the P7 roadmap execution notes.

## Import migration order

Migrate imports in this order:

```txt
1. infrastructure repositories
2. API infrastructure-heavy services/controllers only where they already use schema directly
3. jobs/scripts/seeds if safe
4. compatibility re-export layer
5. leave application schema-free
```

Do not start by changing application use cases. Application should already depend on ports, not schema.

## Application-layer hard rule

Application must not import schema from either old or new path.

Forbidden:

```txt
packages/application/** imports @shared/schema
packages/application/** imports shared/schema
packages/application/** imports @pos/infrastructure/db/schema
packages/application/** imports drizzle-orm for schema/query work
```

Run:

```bash
rg -n "(@shared/schema|shared/schema|@pos/infrastructure/db/schema|drizzle-orm)" packages/application
```

Expected result:

```txt
No matches, unless there is a documented type-only exception already approved. Do not create new exceptions.
```

## Drizzle config rule

Inspect `drizzle.config.ts` and preserve migration/discovery behavior.

If the Drizzle config points to `shared/schema.ts`, do not break it. Either keep it pointing to compatibility `shared/schema.ts` or update it only if the new infrastructure schema index exports all schema symbols correctly and validation passes.

Do not change migration output folder unless explicitly approved.

## Schema identity preservation

For every moved schema definition, preserve exactly:

```txt
table name
column name
column type
notNull/default behavior
references/onDelete behavior
indexes
unique indexes
primary keys
zod insert/select schema names if exported
type export names if exported
```

The refactor should be import-path cleanup, not database shape change.

## Do not break existing consumers

Existing consumers may still import from:

```txt
@shared/schema
shared/schema
```

P7 should keep those imports working through compatibility exports until P8/import-boundary enforcement is ready.

Do not delete exports used by API tests, seeds, repositories, or frontend type imports.

## Required validation

Run:

```bash
pnpm --filter @pos/infrastructure type-check
pnpm --filter @pos/api type-check
pnpm type-check
pnpm run db:check
```

If `pnpm run db:check` requires a local/default database and fails for environment reasons, document the exact reason and run any available schema/static check command.

If the full API test suite is run and hits the known `DATABASE_URL` blocker, document it as environment-limited. Do not delete or weaken the test.

## Required audits before commit

Audit application remains schema-free:

```bash
rg -n "(@shared/schema|shared/schema|@pos/infrastructure/db/schema|drizzle-orm)" packages/application
```

Audit no accidental schema shape changes:

```bash
git diff -- shared/schema.ts packages/infrastructure/db/schema drizzle.config.ts
```

Manually review this diff and document whether it is re-export/import movement only or whether any actual schema shape changed.

Audit no unrelated frontend/backend feature changes:

```bash
git diff -- apps/pos-terminal-web/src/features/pos apps/api/src/realtime/cfd apps/api/src/http/controllers/OrdersController.ts packages/application/orders packages/application/inventory
```

Expected:

```txt
No unrelated P4/P5/P6 behavior changes.
```

## Documentation update

Update:

```txt
roadmap/refactor/p7-s1-s3-schema-boundary-cleanup.md
```

Add execution notes with this structure:

```md
## Execution notes — P7 S1-S3

Status: implemented and validated / partially implemented / blocked

### Strategy chosen

- Strategy A/B/C
- Why this strategy was chosen
- Whether `shared/schema.ts` remains compatibility source or compatibility wrapper

### Completed

- [x] Audited current `shared/schema.ts` imports.
- [x] Created `packages/infrastructure/db/schema` boundary modules.
- [x] Migrated infrastructure/API schema imports where safe.
- [x] Preserved `shared/schema.ts` compatibility exports.
- [x] Kept application layer schema-free.
- [x] Did not change table/column names, constraints, indexes, defaults, or references.
- [x] Did not start P8.

### Validation

- `pnpm --filter @pos/infrastructure type-check`: pass/fail
- `pnpm --filter @pos/api type-check`: pass/fail
- `pnpm type-check`: pass/fail
- `pnpm run db:check`: pass/fail/environment-limited with reason
- application schema import audit: pass/fail

### Behavior preservation

- Runtime DB schema changed: no
- Migration generated: no
- Table names changed: no
- Column names changed: no
- Indexes/constraints changed: no
- Application schema-free boundary preserved: yes/no
- P3 transaction boundary changed: no
- P4 order workflow changed: no
- P5 CFD backend changed: no
- P6 frontend POS changed: no
- Payment/partial payment behavior changed: no
- Inventory behavior changed: no

### Continuation

P7 is complete. Next safe phase is P8 only after user approval.
```

## Commit

Use commit message:

```bash
git commit -m "refactor(db): move schema ownership toward infrastructure"
```

Then push the branch.

## If validation fails

Do not start P8.

Do not delete compatibility exports to force type-check.

Do not hide the failure.

If moving real definitions is too risky, fall back to Strategy B: create infrastructure schema boundary modules that re-export from `shared/schema.ts`, update only safe infrastructure imports, and document remaining work.

If schema identity diff shows runtime DB shape changes, stop and revert that part unless explicitly approved.

## Final report required from agent

Report:

```txt
P7 status:
Commit SHA:
Strategy chosen:
Files changed:
Schema modules added:
shared/schema.ts role after P7:
Imports migrated:
Commands run:
Validation result:
DB schema shape changed: no/yes with details
Migration generated: no/yes with details
Application schema-free audit: pass/fail
P3/P4/P5/P6 preserved: yes/no
Whether P8 was started: no
```
