# AuraPoS Refactor — P5 S1-S3 Realtime CFD Module Split Agent Prompt

You are working in the `Rndynt/AuraPoS` repository.

This prompt is the updated P5 prompt to use after P2, P3, and P4 have been implemented. P4 moved order confirm/cancel inventory orchestration out of `OrdersController` into application workflows. P5 must not touch that work.

## Objective

Execute **P5 S1-S3 — Realtime CFD Module Split** safely.

The goal is to move Customer Facing Display / WebSocket / realtime / pubsub / CFD state logic out of broad API route/server files into a dedicated realtime CFD module, while preserving all public CFD HTTP and WebSocket behavior.

Primary target area:

```txt
apps/api/src/routes.ts
apps/api/src/realtime/cfd/
```

P5 is a behavior-preserving extraction/refactor. It is not a feature phase.

## Read first

Read these files before editing:

```txt
roadmap/refactor/main.md
roadmap/refactor/execution-protocol.md
roadmap/refactor/p5-s1-s3-realtime-cfd-module-split.md
roadmap/refactor/p4-s1-s3-thin-controllers.md
roadmap/refactor/p3-s1-s3-unit-of-work-transaction-boundary.md

apps/api/src/routes.ts
apps/api/src/container.ts
apps/api/src/http/controllers/OrdersController.ts
```

Also search for current CFD/realtime symbols before refactoring:

```bash
rg -n "cfd|Cfd|customer.?facing|WebSocket|ws/cfd|session-token|pubsub|heartbeat|device" apps/api/src
```

## Strict scope

Work only on P5.

Do not start P6.

Do not touch frontend POS.

Do not refactor `apps/pos-terminal-web/src/pages/pos.tsx`.

Do not modify order workflow services created in P4.

Do not move confirm/cancel inventory logic again.

Do not modify payment, partial payment, RecordPayment, CreateAndPayOrder, SyncOfflineOrder, inventory policy, stock movement, or order lifecycle behavior.

Do not change DB schema or migrations.

Do not move schema files.

Do not change public endpoint paths.

Do not change public response shapes.

Do not change WebSocket path.

Do not change auth/RBAC/tenant middleware behavior.

Do not weaken tenant/device mismatch protection.

Do not log raw API keys, session tokens, device tokens, or secrets.

Do not reintroduce Northflow/embedded payment code.

## Public compatibility that must remain stable

Preserve these public contracts:

```txt
POST /api/cfd/session-token
POST /api/cfd/update
WS   /ws/cfd
```

Preserve existing header/query/body behavior for:

```txt
tenantId
outletId if currently used
deviceId if currently used
session token
API key / display key if currently used
```

Do not change how existing clients connect, authenticate, or receive CFD updates unless the change is explicitly documented as a compatibility-preserving alias.

## P4 behavior that must not be touched

P4 moved order confirm/cancel inventory workflow into application services and kept `OrdersController` focused on HTTP concerns. P5 must not change that architecture.

Do not edit the P4 workflow services unless there is a direct compile error caused by P5 imports, and even then keep the fix minimal.

Preserve:

```txt
ConfirmOrderWorkflow
CancelOrderWorkflow
orderInventoryWorkflow
OrdersController confirm/cancel response mapping
event emission after successful order workflow calls
```

## P3 behavior that must not be touched

Do not weaken:

```txt
UnitOfWorkPort.transaction(callback)
RecordPayment idempotency replay
RecordPayment row-lock/concurrency safety
partial-payment remaining balance calculation
CreateAndPayOrder atomic create + payment + inventory behavior
SyncOfflineOrder transaction boundary
strict inventory deduction/reversal transaction behavior
tenant-scoped reads/writes
```

P5 should not need to edit those files.

## Target module structure

Create or normalize this module:

```txt
apps/api/src/realtime/cfd/
  CfdConnectionRegistry.ts
  CfdAuthService.ts
  CfdMessageValidator.ts
  CfdStateStore.ts
  CfdPubSubBridge.ts
  CfdWebSocketServer.ts
  CfdHttpController.ts
  index.ts
```

Equivalent file names are acceptable if responsibility is equally clear.

Responsibilities:

```txt
CfdConnectionRegistry
- tenant/device connection tracking
- connect/disconnect bookkeeping
- heartbeat cleanup support

CfdAuthService
- device token/session token lookup
- tenant/device mismatch checks
- API key/session validation without logging secrets

CfdMessageValidator
- payload schema checks
- message size guard
- reject malformed update payloads

CfdStateStore
- latest CFD state persistence/cache abstraction if current code has state storage
- preserve existing behavior exactly

CfdPubSubBridge
- Redis/pubsub bridge from cross-instance updates to local WS clients
- preserve existing channel names and payload shapes unless documented

CfdWebSocketServer
- WS /ws/cfd lifecycle
- heartbeat/ping-pong
- auth handshake
- subscribe/unsubscribe client connection behavior

CfdHttpController
- HTTP /api/cfd/session-token and /api/cfd/update handlers
- request parsing/response mapping only, delegating realtime concerns to services

index.ts
- clean exports and registration helpers
```

## Registration shape

After extraction, route/server composition should become high-level registration only, conceptually:

```ts
registerCfdHttpRoutes(app, cfdModule);
registerCfdWebSocketServer(httpServer, cfdModule);
```

Actual names may differ, but `routes.ts` must no longer own CFD implementation details such as connection maps, heartbeat internals, pubsub subscriptions, token parsing internals, or payload validation internals.

## What should remain outside CFD module

Keep generic server bootstrapping, global middleware, and unrelated domain route registration outside the CFD module.

Do not move unrelated order, KDS, payment, inventory, tenant, auth, catalog, or POS routes into the CFD module.

## Safety requirements

Preserve:

```txt
- CFD pairing/session-token behavior
- tenant/device mismatch rejection
- heartbeat cleanup
- Redis pubsub propagation if currently present
- message payload shape
- WS message format
- HTTP response shape
- existing status codes where possible
- no raw secret logging
```

Do not replace multi-tenant checks with unscoped lookups.

Do not remove duplicate connection cleanup.

Do not remove server-side validation just because the frontend validates.

## Testing and validation

Run:

```bash
pnpm --filter @pos/api type-check
pnpm --filter @pos/api test
pnpm type-check
```

If the API test suite hits the known DB-backed `DATABASE_URL` blocker, document it honestly and continue if all P5-relevant checks pass. Do not delete, weaken, or hide the DB-backed test.

If CFD tests exist, run them directly.

If CFD tests do not exist, add a manual smoke checklist in the P5 roadmap execution notes:

```txt
1. generate CFD session token
2. connect WS /ws/cfd with tenantId and token
3. POST /api/cfd/update with valid credential
4. verify WS receives payload
5. reject tenant mismatch
6. reject invalid key/token
7. verify heartbeat cleanup still works
8. verify pubsub propagation path remains wired if Redis/pubsub is configured
```

## Required audits before commit

Confirm no accidental order/payment/inventory/schema changes:

```bash
git diff -- apps/api/src/http/controllers/OrdersController.ts packages/application/orders packages/application/inventory packages/application/sync shared/schema.ts packages/infrastructure/db
```

Expected for P5:

```txt
No unrelated order workflow, payment, inventory, sync, schema, or migration changes.
```

Confirm routes compatibility:

```bash
git diff -- apps/api/src/routes.ts apps/api/src/realtime/cfd
```

Review and document that CFD public paths remain:

```txt
POST /api/cfd/session-token
POST /api/cfd/update
WS /ws/cfd
```

## Documentation update

Update:

```txt
roadmap/refactor/p5-s1-s3-realtime-cfd-module-split.md
```

Add execution notes with:

```md
## Execution notes — P5 S1-S3

Status: implemented and validated / implemented with documented environment-limited test skip / blocked

### Completed

- [x] Audited current CFD/WebSocket/realtime responsibilities in route/server files.
- [x] Extracted CFD connection registry/auth/message validation/state/pubsub/WS/HTTP responsibilities into `apps/api/src/realtime/cfd`.
- [x] Kept `routes.ts` focused on high-level CFD registration.
- [x] Preserved CFD HTTP endpoint paths and WebSocket path.
- [x] Preserved tenant/device mismatch protection.
- [x] Preserved heartbeat cleanup.
- [x] Preserved Redis/pubsub propagation if configured.
- [x] Did not touch P4 order workflows, payment, inventory, frontend POS, or DB schema.

### Validation

- `pnpm --filter @pos/api type-check`: pass/fail
- `pnpm --filter @pos/api test`: pass/fail or pass except documented DATABASE_URL blocker
- `pnpm type-check`: pass/fail
- CFD direct tests/manual smoke: pass/fail/not available with checklist

### Compatibility

- `POST /api/cfd/session-token`: unchanged
- `POST /api/cfd/update`: unchanged
- `WS /ws/cfd`: unchanged
- Request/response payload compatibility changed: no
- WS payload compatibility changed: no

### Behavior preservation

- Payment behavior changed: no
- Partial payment behavior changed: no
- Order workflow behavior changed: no
- Inventory behavior changed: no
- DB schema changed: no
- Frontend POS changed: no
- Tenant/outlet/device isolation weakened: no
- P3 transaction boundary weakened: no
- P4 workflow extraction weakened: no

### Continuation

P5 is complete. Next safe phase is P6 only after user approval.
```

## Commit

Use commit message:

```bash
git commit -m "refactor(api): split CFD realtime module"
```

Then push the branch.

## If validation fails

Do not start P6.

Do not hide the failure.

Do not delete or weaken tests.

If `DATABASE_URL` is the only blocker and it is the same known DB-backed payment test issue, document it as an environment-limited skip/blocker and proceed only if P5-relevant type-checks and CFD route checks pass.

If any CFD behavior breaks, fix within P5 scope only.

## Final report required from agent

Report:

```txt
P5 status:
Commit SHA:
Files changed:
CFD module files added/moved:
routes.ts responsibilities removed:
Public endpoint changes: none / documented
WebSocket path changes: none / documented
Commands run:
Tests passed:
DATABASE_URL skips/blockers: yes/no and details
Manual CFD smoke result:
Payment/order/inventory/schema touched: no
P3 transaction boundary preserved: yes/no
P4 order workflows preserved: yes/no
Whether P6 was started: no
```
