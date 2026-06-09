# AuraPoS Refactor — P7 S1-S3 Schema Boundary Cleanup Agent Prompt

Work in `Rndynt/AuraPoS`.

## Objective

Execute P7 only: move DB schema ownership to infrastructure without changing runtime database shape.

This is the only accepted strategy:

```txt
Canonical Infrastructure Schema + shared/schema.ts Compatibility Re-export
```

Final target:

```txt
packages/infrastructure/db/schema/* = canonical Drizzle schema definitions
shared/schema.ts                    = compatibility re-export wrapper
```

There must be one source of truth only. Do not create mirrored schema definitions or multiple competing strategies.

## Read first

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
drizzle.config.ts
```

## Scope

P7 is schema-boundary cleanup only.

Keep all behavior from P2-P6 intact:

```txt
application layer remains schema-free
P3 UnitOfWork transaction behavior unchanged
P4 order workflows unchanged
P5 CFD backend unchanged
P6 frontend POS unchanged
payment, partial payment, inventory, offline, KDS, CFD behavior unchanged
```

No new feature tables. No table rename. No column rename. No index/default/reference/constraint/type changes. No migrations. No P8 enforcement yet.

Expected DB result: zero runtime schema changes.

## Required structure

Create infrastructure schema modules:

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

Adjust module names only when the current schema grouping clearly requires it.

## Implementation

Move actual Drizzle table/schema/type definitions from `shared/schema.ts` into the infrastructure schema modules.

Export every schema symbol from:

```txt
packages/infrastructure/db/schema/index.ts
```

Then convert `shared/schema.ts` into a compatibility wrapper:

```ts
export * from "@pos/infrastructure/db/schema";
```

If that alias does not resolve from `shared/schema.ts`, use the shortest stable relative re-export that passes type-check.

Preserve every existing export name from `shared/schema.ts`.

## Import migration

Migrate safe imports in this order:

```txt
1. infrastructure repositories
2. API files that already import schema directly
3. jobs/scripts/seeds if safe
4. drizzle.config.ts if validation passes
```

Application use cases must not be changed to import schema.

## Validation

Run:

```bash
pnpm --filter @pos/infrastructure type-check
pnpm --filter @pos/api type-check
pnpm type-check
pnpm run db:check
```

Run audits:

```bash
rg -n "@shared/schema|shared/schema|@pos/infrastructure/db/schema|drizzle-orm" packages/application
git diff -- shared/schema.ts packages/infrastructure/db/schema drizzle.config.ts
git diff -- apps/pos-terminal-web/src/features/pos apps/api/src/realtime/cfd apps/api/src/http/controllers/OrdersController.ts packages/application/orders packages/application/inventory
```

Expected:

```txt
application schema audit: no matches
schema diff: movement/re-export/import-path cleanup only
unrelated behavior diff: no P4/P5/P6 behavior changes
```

If `pnpm run db:check` fails because database/env is unavailable, document the exact reason.

## Documentation update

Update `roadmap/refactor/p7-s1-s3-schema-boundary-cleanup.md` with:

```txt
Status
Files changed
Schema modules added
shared/schema.ts role after P7
Imports migrated
Validation results
DB schema shape changed: no
Migration generated: no
Application schema-free audit result
P3/P4/P5/P6 preserved
P8 started: no
```

## Commit

Use:

```bash
git commit -m "refactor(db): move schema ownership to infrastructure"
```

Then push.

## Final report

Report:

```txt
P7 status:
Commit SHA:
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
