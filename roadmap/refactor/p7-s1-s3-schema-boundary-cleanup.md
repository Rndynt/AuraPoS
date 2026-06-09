# P7 S1-S3 — Schema Boundary Cleanup

Status: implemented and validated
Purpose: move DB schema toward infrastructure ownership without breaking existing imports.

## Goal

Reduce `shared/schema.ts` from a central cross-layer dependency into a controlled compatibility boundary.

Do not delete `shared/schema.ts` immediately.

## S1 — Create infrastructure schema modules

Target structure:

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

Implemented: yes.

Schema modules added:

- `packages/infrastructure/db/schema/auth.schema.ts`
- `packages/infrastructure/db/schema/tenants.schema.ts`
- `packages/infrastructure/db/schema/outlets.schema.ts`
- `packages/infrastructure/db/schema/catalog.schema.ts`
- `packages/infrastructure/db/schema/orders.schema.ts`
- `packages/infrastructure/db/schema/inventory.schema.ts`
- `packages/infrastructure/db/schema/kds.schema.ts`
- `packages/infrastructure/db/schema/cfd.schema.ts`
- `packages/infrastructure/db/schema/seating.schema.ts`
- `packages/infrastructure/db/schema/index.ts`

## S2 — Migrate infrastructure imports first

Migration order:

1. infrastructure repositories
2. API infrastructure-heavy services
3. jobs/scripts
4. compatibility layer
5. application imports must already be gone from P2/P3

Implemented in this batch:

- Infrastructure DB and repository imports now use `@pos/infrastructure/db/schema` directly.
- API files that directly imported schema now use `@pos/infrastructure/db/schema` directly.
- API seeds/tests that directly imported schema now use `@pos/infrastructure/db/schema` directly.
- `drizzle.config.ts` now points Drizzle Kit at `packages/infrastructure/db/schema/index.ts` plus the existing Better Auth schema file.
- `packages/infrastructure/package.json` exports `./db/schema` and `./db/schema/*`.

Not migrated in this batch:

- Frontend type-only imports from `@shared/schema` remain on the compatibility wrapper to avoid unnecessary P6 frontend churn.

## S3 — Keep backward compatibility until safe removal

`shared/schema.ts` is now a compatibility re-export wrapper:

```ts
export * from "@pos/infrastructure/db/schema";
```

Every existing schema export name from the previous `shared/schema.ts` remains available through the infrastructure schema barrel.

## Files changed

- `shared/schema.ts`
- `packages/infrastructure/db/schema/auth.schema.ts`
- `packages/infrastructure/db/schema/tenants.schema.ts`
- `packages/infrastructure/db/schema/outlets.schema.ts`
- `packages/infrastructure/db/schema/catalog.schema.ts`
- `packages/infrastructure/db/schema/orders.schema.ts`
- `packages/infrastructure/db/schema/inventory.schema.ts`
- `packages/infrastructure/db/schema/kds.schema.ts`
- `packages/infrastructure/db/schema/cfd.schema.ts`
- `packages/infrastructure/db/schema/seating.schema.ts`
- `packages/infrastructure/db/schema/index.ts`
- `packages/infrastructure/package.json`
- `packages/infrastructure/database.ts`
- `packages/infrastructure/repositories/**`
- `apps/api/src/**` direct schema import sites
- `drizzle.config.ts`
- `PLANS.md`
- `roadmap/refactor/p7-s1-s3-schema-boundary-cleanup.md`

## Hard rules result

- DB schema shape changed: no.
- Migration generated: no.
- Table names changed: no.
- Column names changed: no.
- Index/default/reference/constraint/type changes: no intentional changes; `pnpm run db:check` passed.
- Application layer imports new infrastructure schema modules: no.
- P3 UnitOfWork transaction behavior preserved: yes; no application/order transaction behavior diff.
- P4 order workflows preserved: yes; required unrelated order-controller/application diff audit was empty.
- P5 CFD backend preserved: yes; required CFD diff audit was empty.
- P6 frontend POS preserved: yes; required POS feature diff audit was empty.
- P8 started: no.

## Validation results

- `pnpm --filter @pos/infrastructure type-check` — pass.
- `pnpm --filter @pos/api type-check` — pass.
- `pnpm type-check` — pass, 10/10 Turbo tasks.
- `pnpm run db:check` — pass, Drizzle Kit reported everything is fine.
- `rg -n "@shared/schema|shared/schema|@pos/infrastructure/db/schema|drizzle-orm" packages/application` — pass, no matches.
- `git diff -- shared/schema.ts packages/infrastructure/db/schema drizzle.config.ts` — reviewed; schema movement/re-export/config path change only.
- `git diff -- apps/pos-terminal-web/src/features/pos apps/api/src/realtime/cfd apps/api/src/http/controllers/OrdersController.ts packages/application/orders packages/application/inventory` — pass, empty diff.

## Definition of done

- [x] DB schema has a clear infrastructure-owned module path.
- [x] Existing runtime behavior and table mappings are unchanged.
- [x] `shared/schema.ts` is reduced to a compatibility re-export wrapper.
- [x] Application layer remains schema-free.
