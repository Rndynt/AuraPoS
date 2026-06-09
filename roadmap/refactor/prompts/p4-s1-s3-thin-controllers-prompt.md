# P4 S1-S3 Thin Controllers — Agent Prompt

Work in `Rndynt/AuraPoS`.

## Objective

Execute only P4: make HTTP controllers thinner by moving order business workflow out of `apps/api/src/http/controllers/OrdersController.ts` into application-layer services/use cases.

## Read first

- `roadmap/refactor/main.md`
- `roadmap/refactor/execution-protocol.md`
- `roadmap/refactor/p4-s1-s3-thin-controllers.md`
- `roadmap/refactor/p3-s1-s3-unit-of-work-transaction-boundary.md`
- `apps/api/src/http/controllers/OrdersController.ts`
- `apps/api/src/container.ts`
- `packages/application/orders/ConfirmOrder.ts`
- `packages/application/orders/CancelOrder.ts`
- `packages/application/shared/ports/UnitOfWorkPort.ts`
- `packages/infrastructure/unit-of-work/DrizzleUnitOfWork.ts`

## Strict scope

- Do not start P5.
- Do not touch frontend POS.
- Do not split CFD/WebSocket/realtime modules.
- Do not move schema files.
- Do not rename endpoints.
- Do not change request/response shape.
- Do not change DB schema.
- Do not change auth, RBAC, feature guard, tenant middleware, or outlet middleware behavior.
- Do not change cash, standard payment, partial payment, order lifecycle, or offline sync behavior.
- Do not weaken tenant/outlet isolation.

## Preserve P3 behavior

P3 is fully validated. Preserve:

1. `UnitOfWorkPort.transaction(callback)`.
2. RecordPayment idempotency replay.
3. RecordPayment row-lock/concurrency safety.
4. Partial-payment remaining-balance calculation.
5. CreateAndPayOrder atomic create + payment + inventory behavior.
6. SyncOfflineOrder transaction boundary.
7. Strict inventory deduction inside transaction boundary.
8. Stock reversal inside transaction boundary.
9. Tenant-scoped reads/writes.

## Move out of OrdersController

Extract business workflow from `OrdersController.ts` into application-layer services/use cases, especially:

- confirm order + inventory deduction workflow
- cancel order + inventory reversal workflow
- inventory policy decision
- stock deduction/reversal orchestration
- inventory sync error orchestration
- order lifecycle workflow decisions

Controller should keep only HTTP concerns: parse request, read tenant/outlet/user context, call container/use case/service, emit transport-level events if still appropriate, map response, and pass errors to middleware.

Suggested services:

- `packages/application/orders/services/ConfirmOrderWorkflow.ts`
- `packages/application/orders/services/CancelOrderWorkflow.ts`

Equivalent names are allowed if consistent.

Application layer must not import Express, API app files, infrastructure database, shared schema, or Drizzle.

Do not pass `Request` or `Response` into application services. Pass plain input objects such as `tenantId`, `outletId`, `orderId`, `actorId`, and `cancellationReason`.

## Container wiring

Update `apps/api/src/container.ts` only as needed to expose the new workflow services.

Preserve existing order queue/KDS/realtime event emission behavior. If an event is transport-level, it may stay in the controller. Do not silently remove event emission.

## Validation

Run:

- `pnpm --filter @pos/application type-check`
- `pnpm --filter @pos/api type-check`
- `pnpm --filter @pos/api test`
- `pnpm type-check`

Also confirm DB-backed coverage for:

- `record-payment-idempotency.test.ts`
- `create-and-pay-stock-concurrency.test.ts`

Run forbidden import audit:

- `rg -n "(express|@pos/infrastructure/database|@shared/schema|shared/schema|drizzle-orm|apps/api)" packages/application`

Expected: no new forbidden application imports from P4.

## Documentation update

Update `roadmap/refactor/p4-s1-s3-thin-controllers.md` with execution notes:

- Status: implemented and validated / partially implemented / blocked
- Completed work
- Validation commands and results
- Behavior preservation notes
- Confirmation that P5 was not started

Behavior preservation must explicitly state:

- endpoint behavior changed: no
- DB schema changed: no
- cash payment changed: no
- standard payment changed: no
- partial payment changed: no
- order lifecycle changed: no
- offline sync changed: no
- tenant/outlet isolation weakened: no
- P3 transaction boundary weakened: no

## Commit

Use commit message:

`refactor(api): move order workflows out of controller`

## Final report

Report:

- P4 status
- commit SHA
- files changed
- controllers thinned
- application services/use cases added
- commands run
- tests passed
- endpoint changes: none/documented
- DB schema changes: none
- P3 transaction boundary preserved: yes/no
- whether P5 was started: no
