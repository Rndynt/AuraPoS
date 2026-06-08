# AuraPoS Architecture Refactor Roadmap

Status: planned
Scope: architecture refactor only
Target style: modular monorepo, clean architecture-ish, hexagonal ports/adapters, strict separation of concerns
Execution model: staged, behavior-preserving, no big-bang rewrite

## Final objective

Refactor AuraPoS so it is modular not only by folder, but also by dependency direction and runtime responsibility.

Target ownership:

- `apps/api`: HTTP transport, composition root, auth/tenant middleware, route registration.
- `apps/pos-terminal-web`: POS UI, feature-level frontend flows, API clients, offline UX.
- `packages/domain`: pure business concepts, entities, value types, domain rules.
- `packages/application`: use cases, orchestration, ports/contracts, business flow.
- `packages/infrastructure`: Drizzle/PostgreSQL, repositories, cache, pubsub, provider adapters, external systems.
- `packages/offline`: offline storage, local queue, local print/order sync primitives.
- `shared`: compatibility/public shared types only; not a free-for-all DB schema dependency.

## Non-negotiable rules

1. Application layer must not import infrastructure, database, Drizzle schema, or `shared/schema`.
2. Infrastructure must implement application ports/contracts.
3. Controllers must be thin HTTP adapters.
4. Route files must not contain large realtime/domain logic.
5. Frontend POS page must not own payment, KDS, CFD, printer, and offline flows directly.
6. Existing POS behavior must remain stable.
7. Standard cash/payment flow must not be removed.
8. Partial payment, order, payment, inventory, offline, KDS, and CFD behavior must not regress.
9. Do not mix feature development with architecture refactor.
10. Every phase must have a clear validation command list and commit boundary.

## Current known problem areas

- Application layer DB leaks in order, sync, catalog, and inventory use cases.
- `OrdersController` still contains business orchestration that belongs in application services/use cases.
- `apps/api/src/routes.ts` contains too much CFD/WebSocket/session/pubsub/state logic.
- `apps/pos-terminal-web/src/pages/pos.tsx` is too large and owns too many flows.
- `shared/schema.ts` is too central and crosses layer boundaries.

## Target phase files

- `p0-baseline-safety-net.md`
- `p1-s1-s3-ports-contracts.md`
- `p2-s1-s4-application-db-leak-removal.md`
- `p3-s1-s3-unit-of-work-transaction-boundary.md`
- `p4-s1-s3-thin-controllers.md`
- `p5-s1-s3-realtime-cfd-module-split.md`
- `p6-s1-s4-frontend-pos-feature-split.md`
- `p7-s1-s3-schema-boundary-cleanup.md`
- `p8-s1-s3-import-boundary-enforcement.md`

## Dependency direction target

Allowed:

- `apps/api` may import application, infrastructure, domain.
- `packages/infrastructure` may import application ports and domain.
- `packages/application` may import domain and pure core utilities.
- `packages/domain` must stay framework-free and persistence-free.

Forbidden:

- `packages/application` importing `@pos/infrastructure/database`.
- `packages/application` importing `@shared/schema`.
- `packages/application` importing Drizzle table/schema definitions.
- `packages/domain` importing apps, application, infrastructure, Express, React, or Drizzle.
- `apps/pos-terminal-web` importing infrastructure.

## Payment and standalone compatibility rule

AuraPoS currently uses `tenantId` as SaaS tenant scope. That remains correct inside AuraPoS.

For future standalone payment extraction, do not hard-rename every `tenantId` to `merchantId` now. Use a compatibility context later:

```ts
type PaymentContext = {
  tenantId: string;
  merchantId?: string;
  sourceApp?: string;
  externalTenantId?: string;
  outletId?: string | null;
  locationId?: string | null;
};
```

Rules:

- AuraPoS embedded mode: `tenantId` remains required for tenant isolation.
- Standalone payment mode later: `merchantId` becomes primary payment owner.
- AuraPoS `tenantId` later becomes `externalTenantId` or source context.
- Do not mix SaaS tenant identity and payment merchant identity blindly.

## Overall definition of done

This roadmap is complete only when:

1. `packages/application` has zero imports from `@pos/infrastructure/database`.
2. `packages/application` has zero imports from `@shared/schema`.
3. Application use cases depend on ports/contracts, not Drizzle/Postgres.
4. Infrastructure implements application ports with Drizzle/PostgreSQL adapters.
5. API composition root wires all dependencies explicitly.
6. Controllers are thin HTTP adapters.
7. CFD/WebSocket logic is isolated in a realtime module.
8. POS page is reduced to UI orchestration.
9. `shared/schema` is no longer an unrestricted cross-layer dependency.
10. Import boundary rules are enforced by lint or CI.
11. Existing POS order, payment, cash, partial payment, offline, KDS, and CFD behavior is preserved.
