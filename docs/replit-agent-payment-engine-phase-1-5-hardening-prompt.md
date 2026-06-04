# Replit Agent Prompt — Payment Engine Phase 1.5 Hardening

Use this prompt in Replit Agent.

You are working in the AuraPoS repository.

This is **Payment Engine Phase 1.5 Hardening**. Do not implement Phase 2 gateway work yet.

Read first:

- `docs/payment-engine-roadmap.md`
- `docs/reports/payment-engine-phase-1-report.md`
- `docs/reports/payment-engine-phase-1-hardening-report.md`
- `docs/replit-agent-payment-engine-phase-1-hardening-prompt.md`

Reviewed hardening commit:

- `06c5526f8923217df1cc54d0bf7eea31cd6d9142`

## Do not change legacy order payment behavior

Do not intentionally change:

- `/api/orders/:id/payments`
- `/api/orders/create-and-pay`
- `packages/application/orders/RecordPayment.ts`
- `packages/application/orders/CreateAndPayOrder.ts`
- `apps/api/src/http/routes/orders.ts`
- `order_payments` legacy table behavior

## Do not implement future phases

Do not implement:

- real Midtrans/Xendit/Stripe integration
- gateway webhook processing
- order adapter integration
- POS UI changes
- split bill
- customer ledger
- stock reservation
- PPOB wallet or agent credit
- refund/void flow

## Main goal

Fix the remaining Phase 1.5 production-safety gaps:

1. Idempotency key conflict across different payment intents.
2. Real DB-backed concurrency test for duplicate idempotency/payment race.
3. Invalid tenant UUID should not become an unhandled 500.
4. Prepare payment-engine route authorization shape without overbuilding auth.
5. Update tests and report.

---

## Task 1 — Fix idempotency key conflict across intents

Current risk:

- `RecordManualPayment` replays any existing transaction with the same `tenantId + idempotencyKey`.
- It does not verify that the existing transaction belongs to the same `paymentIntentId` requested by the caller.

Required behavior:

- If same `tenantId + idempotencyKey` exists and `existingTx.paymentIntentId === input.paymentIntentId`, replay it.
- If same `tenantId + idempotencyKey` exists but `existingTx.paymentIntentId !== input.paymentIntentId`, reject with a clear conflict error.
- Use HTTP 409 for this conflict through the payment engine controller.
- Do not create a new transaction.
- Do not create an allocation.
- Do not change `amountPaid`.

Suggested domain/application error:

- code: `IDEMPOTENCY_KEY_CONFLICT`
- message: `Idempotency key was already used for a different payment intent`

Acceptance tests:

- Same key + same intent replays existing transaction.
- Same key + different intent returns conflict.
- Conflict does not create extra transaction or allocation.
- Controller maps this conflict to HTTP 409.

---

## Task 2 — Add DB-backed concurrency test

The current concurrency-style test uses in-memory fakes and explicitly allows weak behavior. That is not enough for payment engine safety.

Add a DB-backed test if repo infrastructure allows it.

Test goal:

- Create one payment intent with `allowPartial = false` and `amountDue = 100000`.
- Fire two concurrent `RecordManualPayment` calls with the same idempotency key.
- Expected result:
  - only one `payment_transactions` row exists for that idempotency key
  - only one default allocation exists for that transaction
  - `payment_intents.amountPaid = 100000`
  - `payment_intents.status = paid`
  - the second call returns idempotent replay or safe conflict/replay behavior, not a duplicate payment

Also add a second DB-backed race test if practical:

- Same intent, two different idempotency keys, each tries to pay full remaining amount concurrently.
- Expected result:
  - one succeeds
  - the other fails because the intent is already paid or amount exceeds remaining after lock
  - final `amountPaid` must not exceed `amountDue`

If DB-backed tests are not practical in the current repo, create a clear report section explaining why and add the strongest possible integration-style fake test. Do not falsely claim DB concurrency is proven by in-memory fake tests.

---

## Task 3 — Invalid tenant UUID handling

Hardening report found that a wrong tenant string can trigger upstream PostgreSQL UUID syntax error and produce 500.

Required:

- Inspect tenant middleware / tenant resolution flow.
- If `x-tenant-id` or any tenant id input is not a valid UUID, return a clean 400 or 404 response, not 500.
- Do not change valid tenant behavior.
- Do not weaken tenant isolation.

Acceptance tests:

- Missing tenant context on `/api/payment-engine` returns 401.
- Invalid tenant UUID returns 400 or 404, not 500.
- Valid tenant still works.

---

## Task 4 — Route authorization shape

Phase 1 currently has tenant-only guard. That is acceptable for base engine, but payment endpoints need a clean authorization seam before POS UI/gateway work.

Required:

- Inspect existing role/auth middleware.
- If there is an existing cashier/manager/owner guard, apply it to payment-engine routes.
- If there is no reliable RBAC middleware yet, add a small placeholder middleware with clear naming and TODO, for example `requirePaymentOperator`, that currently enforces tenant context and is easy to upgrade later.
- Do not overbuild AuthCore integration.
- Do not block existing tests unnecessarily.

Acceptance:

- Payment-engine routes clearly show where payment authorization is enforced.
- Report explains whether real role guard exists or placeholder guard was used.

---

## Task 5 — Tests and report

Update or add tests for:

- idempotency conflict same key different intent
- controller HTTP 409 mapping for idempotency conflict
- DB-backed duplicate-idempotency concurrency if possible
- DB-backed full-payment race with different idempotency keys if possible
- invalid tenant UUID returns non-500
- route guard behavior remains correct
- existing manual full/partial payment behavior still passes

Create report:

- `docs/reports/payment-engine-phase-1-5-hardening-report.md`

Report must include:

- summary
- files changed
- idempotency conflict behavior
- DB concurrency test status and result
- invalid tenant UUID handling
- route authorization shape
- tests added/updated
- commands run
- failures or pre-existing issues
- confirmation that legacy order payment flow was not intentionally changed
- confirmation that gateway/webhook/order adapter/split bill/ledger/stock/PPOB/refund/void were not implemented

## Commands to run

Run available checks:

- `npm run check`
- payment engine test command
- repo test command if available
- `npm run db:check` if available

If a command fails due to a pre-existing issue, report the exact relevant error summary.

## Commit

Commit all changes with a clear message, for example:

`fix(payment-engine): harden idempotency conflicts and concurrency tests`

Final Replit response must include:

- summary
- commit SHA
- files changed
- tests/checks run
- known issues
- confirmation that legacy order payment flow was not intentionally changed
