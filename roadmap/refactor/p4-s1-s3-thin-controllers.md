# P4 S1-S3 — Thin Controllers

Status: planned
Purpose: move business orchestration out of HTTP controllers.

## Goal

Controllers should only handle HTTP concerns:

- parse request
- validate DTO
- read tenant/outlet/user context
- call use case
- map response
- pass errors to middleware

Controllers must not own order/payment/inventory business workflow.

## S1 — Audit controller responsibilities

Primary target:

```txt
apps/api/src/http/controllers/OrdersController.ts
```

Identify logic that must move to application layer:

- inventory movement policy
- stock deduction/reversal
- inventory sync error recording
- order lifecycle transition rules
- payment/fulfillment orchestration
- emit decision coupling when it represents business workflow

## S2 — Create application orchestration services/use cases

Move business workflow to application use cases or services:

```txt
packages/application/orders/use-cases/
packages/application/orders/services/
packages/application/inventory/services/
```

Examples:

```txt
ConfirmOrderWithInventory
CancelOrderWithInventoryReversal
CreateKitchenTicketForOrder
RecordOrderPayment
CompleteOrderWorkflow
```

Names may be adjusted, but responsibility must be explicit.

## S3 — Keep transport layer stable

Routes and public API responses must remain compatible unless a dedicated compatibility note is written.

Controller after refactor should look conceptually like:

```ts
const result = await container.confirmOrderWorkflow.execute({
  tenantId: req.tenantId!,
  outletId: req.outletId ?? null,
  orderId: req.params.id,
  actorId: req.user?.id,
});

res.status(200).json({ success: true, data: result });
```

## Hard rules

- Do not remove existing RBAC/feature guard behavior.
- Do not remove outlet ownership enforcement; move it to use case or keep it as transport guard if appropriate.
- Do not move HTTP request/response objects into application layer.
- Do not make application layer import Express.
- Do not change endpoint path or response shape unless documented.

## Validation commands

```bash
pnpm --filter @pos/api type-check
pnpm --filter @pos/application type-check
pnpm --filter @pos/api test
pnpm type-check
```

## Definition of done

- OrdersController is significantly thinner.
- Business workflows are in application layer.
- Application layer has no Express imports.
- Existing order/payment/inventory behavior is preserved.

## Execution notes — P4 S1-S3

Commit: pending
Date: 2026-06-09

Status: implemented with type-check validation; one DB-backed API test remains blocked in this environment because `DATABASE_URL` is not set.

### Affected files

- `apps/api/src/http/controllers/OrdersController.ts`
- `apps/api/src/container.ts`
- `packages/application/orders/services/ConfirmOrderWorkflow.ts`
- `packages/application/orders/services/CancelOrderWorkflow.ts`
- `packages/application/orders/services/orderInventoryWorkflow.ts`
- `packages/application/orders/index.ts`
- `PLANS.md`

### Completed

- [x] Audited `OrdersController` responsibilities and identified confirm/cancel inventory workflow, inventory policy decisions, stock movement/reversal orchestration, inventory sync error recording, and cancellation stock-state checks as business orchestration that did not belong in the HTTP controller.
- [x] Moved confirm-order inventory deduction orchestration into `ConfirmOrderWorkflow` in the application layer.
- [x] Moved cancel-order stock reversal orchestration and outlet-scoped pre-cancel lookup into `CancelOrderWorkflow` in the application layer.
- [x] Moved shared order inventory helpers into an application-layer workflow helper without Express, Drizzle, shared schema, infrastructure database, or API imports.
- [x] Wired the new workflow services in the API container.
- [x] Kept `OrdersController` focused on HTTP parsing/validation, tenant/outlet context reading, workflow invocation, event emission, and response mapping for the touched confirm/cancel/kitchen-ticket paths.
- [x] Preserved order queue event emission after successful workflow calls.
- [x] Preserved endpoint paths and response shapes.
- [x] Preserved the P3 `UnitOfWorkPort.transaction(callback)` boundary for strict inventory confirm/cancel paths.

### Validation results

- `pnpm --filter @pos/application type-check`: pass.
- `pnpm --filter @pos/api type-check`: pass.
- `pnpm --filter @pos/api test`: fail due to environment blocker; 194/195 tests passed and `record-payment-idempotency.test.ts` failed at startup because `DATABASE_URL` is not set.
- `pnpm type-check`: pass, 10/10 Turbo tasks.
- `rg -n "(express|@pos/infrastructure/database|@shared/schema|shared/schema|drizzle-orm|apps/api)" packages/application`: pass, no matches.
- `git diff -- apps/api/src/http/routes apps/api/src/http/controllers`: reviewed; no route path changes and touched controller response shapes remain unchanged.
- `git diff -- shared/schema.ts packages/infrastructure/db`: pass, no DB schema or migration diff.

### Validation blocker

- `record-payment-idempotency.test.ts` requires a configured `DATABASE_URL` in this environment. The broader API suite reached 194 passing tests before this DB-backed test failed at startup; this failure is not caused by P4 controller extraction code.

### Behavior preservation

- Endpoint behavior changed: no.
- API contract changed: no.
- DB schema changed: no.
- Cash payment behavior changed: no.
- Standard payment behavior changed: no.
- Partial payment behavior changed: no.
- Payment idempotency behavior changed: no intentional change; DB-backed idempotency test could not start without `DATABASE_URL`.
- Order lifecycle behavior changed: no.
- Offline sync behavior changed: no.
- Offline/KDS/CFD affected: KDS kitchen-ticket auto-confirm still emits the same order queue events; no CFD/offline flow changes.
- Tenant/outlet isolation weakened: no.
- P3 transaction boundary weakened: no.

### Follow-up risks

- Re-run `pnpm --filter @pos/api test` with `DATABASE_URL` configured to complete DB-backed `record-payment-idempotency.test.ts` validation.

### Continuation

P4 implementation is complete for S1-S3. Do not start P5 until the user approves the next phase.
