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

## Final target source tree

This is the desired final direction. Agents must not invent a different architecture unless the roadmap is updated first.

```txt
packages/domain/
  catalog/
  orders/
  payments/
  tenants/
  inventory/
  pricing/

packages/application/
  shared/ports/
    UnitOfWorkPort.ts
    ClockPort.ts
    IdGeneratorPort.ts
  orders/ports/
    OrderRepositoryPort.ts
    OrderPaymentRepositoryPort.ts
    OrderNumberSequencePort.ts
    OrderInventoryPort.ts
  orders/use-cases/
  orders/services/
  catalog/ports/
  tenants/ports/
  inventory/ports/
  inventory/services/

packages/infrastructure/
  db/
    schema/
      catalog.schema.ts
      orders.schema.ts
      tenants.schema.ts
      inventory.schema.ts
      cfd.schema.ts
      index.ts
    DrizzleUnitOfWork.ts
  repositories/
    orders/
    catalog/
    tenants/
    inventory/
  cache/
  pubsub/
  providers/

apps/api/src/
  composition/
    container.ts
  http/
    controllers/
    routes/
    dto/
    middleware/
    error/
  realtime/
    cfd/
  jobs/

apps/pos-terminal-web/src/
  features/
    pos/
      pages/
      components/
      hooks/
      services/
      mappers/
    payments/
    kitchen/
    customer-display/
    printer/
    offline/
  shared/
    ui/
    api/
    hooks/
    lib/
```

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
11. Do not start the next phase until the current phase checklist is completed and committed.
12. If validation fails after edits, stop and fix the current phase only; do not continue to the next phase.

## Current known problem areas

- Application layer DB leaks in order, sync, catalog, and inventory use cases.
- `OrdersController` still contains business orchestration that belongs in application services/use cases.
- `apps/api/src/routes.ts` contains too much CFD/WebSocket/session/pubsub/state logic.
- `apps/pos-terminal-web/src/pages/pos.tsx` is too large and owns too many flows.
- `shared/schema.ts` is too central and crosses layer boundaries.

## Migration map

The following mapping defines the intended movement. It is not optional guidance; it is the target plan.

### Application DB leak cleanup

```txt
packages/application/orders/RecordPayment.ts
  keep: payment business rule and use case entry point
  move out: DB transaction, row lock SQL, Drizzle table access
  target adapters: DrizzleOrderRepository, DrizzleOrderPaymentRepository, DrizzleUnitOfWork

packages/application/orders/CreateAndPayOrder.ts
  keep: create-and-pay orchestration and business validation
  move out: direct table inserts, raw DB transaction dependency, sequence persistence
  target adapters: DrizzleOrderRepository, DrizzleOrderPaymentRepository, DrizzleOrderNumberSequenceRepository, DrizzleUnitOfWork

packages/application/sync/SyncOfflineOrder.ts
  keep: offline sync use case behavior
  move out: DB-specific upsert/insert/query implementation
  target adapters: order/payment/inventory repositories plus UnitOfWork

packages/application/catalog/CreateOrUpdateProduct.ts
  keep: catalog use case orchestration
  move out: direct DB dependency
  target adapters: DrizzleProductRepository and related catalog repositories

packages/application/inventory/*
  keep: inventory policy decisions and service contracts
  move out: direct database access, table mapping, sync error persistence
  target adapters: DrizzleInventoryPolicyRepository, DrizzleStockMovementRepository, DrizzleInventorySyncErrorRepository
```

### Controller and API cleanup

```txt
apps/api/src/http/controllers/OrdersController.ts
  keep: request parsing, DTO validation, response mapping
  move out: inventory decisions, stock movement orchestration, payment lifecycle decisions
  target: packages/application/orders/use-cases and packages/application/inventory/services

apps/api/src/routes.ts
  keep: high-level route/server registration
  move out: CFD WebSocket/session/pubsub/state logic
  target: apps/api/src/realtime/cfd/*

apps/api/src/container.ts
  keep: composition root responsibility
  adjust: wire ports to infrastructure adapters explicitly
  do not: hide infrastructure dependencies inside use cases
```

### Frontend POS cleanup

```txt
apps/pos-terminal-web/src/pages/pos.tsx
  keep: page-level UI orchestration only
  move out: payment flow, partial payment flow, KDS flow, CFD flow, receipt/printer flow, offline flow, SSE queue flow
  target: apps/pos-terminal-web/src/features/pos/hooks, services, and mappers
```

### Schema boundary cleanup

```txt
shared/schema.ts
  keep temporarily: compatibility exports
  move toward: packages/infrastructure/db/schema/*
  do not: let packages/application import new infrastructure schema modules
```

## Phase dependency lock

- P0 must be completed before any code refactor.
- P1 must be completed before P2 and P3.
- P2 must start before P4, because controllers should call clean application use cases.
- P3 must be completed before transactional payment/order/inventory flows are considered safe.
- P4 must not be mixed with P6.
- P5 can run after P0, but must not modify order/payment business logic.
- P6 can run after P0, but must not modify backend use cases or DB schema.
- P7 must not start until application imports from `shared/schema` are removed.
- P8 must be last, after known boundary violations are cleaned.

## Agent execution protocol

Every coding agent must follow this sequence for each phase:

1. Read `roadmap/refactor/main.md`.
2. Read the specific phase file.
3. Inspect the current code before editing.
4. List affected files in the phase notes.
5. Implement only the current phase scope.
6. Do not opportunistically refactor unrelated files.
7. Run the validation commands from the phase file.
8. If validation fails, fix only current-phase issues.
9. Update the phase checklist/status notes.
10. Commit with a phase-specific message.
11. Stop and wait for user approval before starting the next phase.

## Rollback and failure rule

If a phase causes regression or validation failure that cannot be fixed inside the phase scope:

1. Stop immediately.
2. Document the failing command and error summary in the phase file.
3. Revert the phase commit or create a corrective commit limited to the phase.
4. Do not proceed to the next phase.
5. Do not hide the failure by weakening tests, removing checks, or changing unrelated behavior.

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

## Per-phase checklist template

Every phase must maintain this checklist:

```md
## Execution checklist

- [ ] Read `roadmap/refactor/main.md`.
- [ ] Read this phase document.
- [ ] Inspect current affected files before editing.
- [ ] List affected files in phase notes.
- [ ] Implement only this phase scope.
- [ ] Preserve public API behavior.
- [ ] Preserve cash/standard POS payment behavior when payment/order code is touched.
- [ ] Run validation commands.
- [ ] Record validation result.
- [ ] Commit this phase only.
```

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
