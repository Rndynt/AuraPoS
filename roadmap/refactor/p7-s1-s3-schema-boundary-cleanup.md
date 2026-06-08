# P7 S1-S3 — Schema Boundary Cleanup

Status: planned
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
  index.ts
```

Move schema by domain gradually. Keep exports stable through compatibility re-exports during transition.

## S2 — Migrate infrastructure imports first

Migration order:

1. infrastructure repositories
2. API infrastructure-heavy services
3. jobs/scripts
4. compatibility layer
5. application imports must already be gone from P2/P3

Do not start by changing application use cases. Application should already depend on ports, not schema.

## S3 — Keep backward compatibility until safe removal

`shared/schema.ts` may temporarily re-export from infrastructure schema modules.

Only remove or shrink it after:

- all direct imports are mapped
- type-check passes
- import boundary rules are ready
- migration impact is documented

## Hard rules

- Do not change table names accidentally.
- Do not change column names accidentally.
- Do not generate DB migrations unless a real schema change is intended and documented.
- Do not break Drizzle config.
- Do not delete compatibility exports prematurely.
- Do not let application layer import the new infrastructure schema modules.

## Validation commands

```bash
pnpm --filter @pos/infrastructure type-check
pnpm --filter @pos/api type-check
pnpm type-check
```

If Drizzle validation scripts exist, run them. If migrations are touched, run the migration check command used by the repo.

## Definition of done

- DB schema has a clear infrastructure-owned module path.
- Existing runtime behavior and table mappings are unchanged.
- `shared/schema.ts` is reduced or documented as temporary compatibility.
- Application layer remains schema-free.
