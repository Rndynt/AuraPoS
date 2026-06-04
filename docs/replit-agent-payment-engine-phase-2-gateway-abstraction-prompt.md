# Replit Agent Prompt — Payment Engine Phase 2 Gateway Abstraction

Use this prompt in Replit Agent.

You are working in the AuraPoS repository.

This is **Payment Engine Phase 2: Gateway Abstraction**.

Read first:

- `docs/payment-engine-roadmap.md`
- `docs/reports/payment-engine-phase-1-report.md`
- `docs/reports/payment-engine-phase-1-hardening-report.md`
- `docs/reports/payment-engine-phase-1-5-hardening-report.md`
- `docs/reports/payment-engine-phase-1-5-followup-report.md`

Current reviewed base:

- `56d00f45762c762aedac043482979fd1da00dbef`

## Do not change legacy order payment behavior

Do not intentionally change:

- `/api/orders/:id/payments`
- `/api/orders/create-and-pay`
- `packages/application/orders/RecordPayment.ts`
- `packages/application/orders/CreateAndPayOrder.ts`
- `apps/api/src/http/routes/orders.ts`
- `order_payments` legacy table behavior

## Do not implement future phases yet

Do not implement:

- real Midtrans/Xendit/Stripe integration
- production webhook processing
- order adapter integration
- POS UI changes
- split bill
- customer ledger
- stock reservation
- PPOB wallet or agent credit
- refund/void flow

## Main goal

Add a reusable gateway abstraction layer on top of the existing payment engine without integrating any real external provider yet.

Phase 2 must support:

1. Provider registry.
2. Fake gateway provider for tests/dev only.
3. Creating a pending gateway payment transaction.
4. Returning fake payment URL / QR string / provider reference.
5. Confirming a fake gateway payment in a controlled dev/test endpoint or use case.
6. Recalculating the payment intent only when the pending transaction becomes `succeeded`.
7. Strong idempotency and tenant isolation.
8. Tests and report.

---

## Task 1 — Add Provider Registry

Create a small provider registry under the payment module. Suggested files:

- `packages/domain/payments/providerRegistry.ts` or
- `packages/application/payments/PaymentProviderRegistry.ts`

Requirements:

- Register providers by `providerCode`.
- Retrieve provider by code.
- Throw clear error for unsupported provider.
- Phase 2 providers:
  - `manual` may already exist.
  - `fake_gateway` must be added.

Do not hardcode provider logic directly in controllers.

---

## Task 2 — Add FakeGatewayProvider

Create a fake provider implementation for dev/test only.

Suggested file:

- `packages/infrastructure/payments/providers/FakeGatewayProvider.ts`

Behavior:

- `providerCode = 'fake_gateway'`.
- `createPayment()` returns:
  - `providerReference`: deterministic unique reference like `fake_<paymentIntentId>_<timestamp or random>`.
  - `providerPaymentUrl`: fake URL such as `/fake-gateway/pay/{providerReference}` or `https://fake-gateway.local/pay/{providerReference}`.
  - `providerQrString`: fake QR payload string.
  - `succeededImmediately: false`.
  - `failureReason: null`.
- `cancelPayment()` can return `success: false` with clear Phase 4/Phase 3 limitation unless you add cancel support explicitly for pending fake tx.
- `refundPayment()` must return `success: false`; refund is not Phase 2.
- `verifyWebhook()` should return false or unsupported; real webhook is Phase 3.
- `parseWebhook()` should throw unsupported; real webhook is Phase 3.

Do not add real provider credentials.
Do not add external API calls.

---

## Task 3 — Create Gateway Payment Use Case

Create use case:

- `packages/application/payments/CreateGatewayPayment.ts`

Input:

- `tenantId`
- `paymentIntentId`
- `amount`
- `method`: `qris | ewallet | card | bank_transfer | other`
- `provider`: for Phase 2 only allow `fake_gateway`
- `idempotencyKey?`
- `metadata?`

Rules:

- Amount must be greater than zero.
- Lock payment intent row with `FOR UPDATE`.
- Tenant must match.
- Terminal intents cannot create new gateway payments.
- Use same amount validation as manual payments:
  - if `allowPartial = false`, gateway amount must settle remaining amount.
  - if `allowPartial = true`, gateway amount may be lower than remaining amount.
  - amount cannot exceed remaining amount.
- Idempotency:
  - same tenant + same idempotency key + same intent returns existing gateway transaction.
  - same key + different intent returns `IDEMPOTENCY_KEY_CONFLICT`.
  - do not duplicate pending transactions.
- Call provider registry to create the provider payment.
- Insert `payment_transactions` row with:
  - `direction = incoming`
  - `transactionType = payment` by default
  - `provider = fake_gateway`
  - `status = pending` or `requires_action`
  - `providerReference`
  - `providerPaymentUrl`
  - `providerQrString`
  - amount
  - idempotencyKey
- Do not create payment allocation yet for pending gateway payment, unless you explicitly decide allocations can exist for pending transactions. Preferred: create allocation only when transaction succeeds.
- Do not update `payment_intents.amountPaid` for pending transaction.
- Return transaction + intent + provider action fields.

Acceptance:

- Pending gateway transaction does not mark intent as paid.
- Intent remains `requires_payment` or previous status until success confirmation.
- Idempotency replay returns the same pending transaction.

---

## Task 4 — Add Controlled Fake Gateway Confirmation

Phase 3 will implement real webhooks. For Phase 2, add only a controlled fake confirmation path for dev/test.

Suggested use case:

- `packages/application/payments/ConfirmFakeGatewayPayment.ts`

Input:

- `tenantId`
- `providerReference`
- `status`: `succeeded | failed`
- `metadata?`

Rules:

- Only provider `fake_gateway` transactions can be confirmed through this use case.
- Find transaction by provider reference and tenant.
- Must be pending/requires_action; reject if already succeeded/failed/cancelled.
- Run inside DB transaction.
- Lock related payment intent row with `FOR UPDATE`.
- If status is `succeeded`:
  - update transaction status to `succeeded`.
  - set `succeededAt`.
  - create default allocation to the intent payable target.
  - recalculate intent within same DB transaction.
- If status is `failed`:
  - update transaction status to `failed`.
  - set `failedAt` and failure reason.
  - do not create allocation.
  - do not increase amountPaid.
  - intent status should remain based on succeeded transactions only.

This is not a webhook. Name route clearly as fake/dev/test confirmation so it is not mistaken for production provider callback.

---

## Task 5 — API Endpoints

Add endpoints under existing `/api/payment-engine` routes.

Required endpoint 1:

`POST /api/payment-engine/intents/:id/gateway-payments`

Body:

```json
{
  "amount": 100000,
  "method": "qris",
  "provider": "fake_gateway",
  "metadata": {},
  "idempotency_key": "optional-key"
}
```

Response:

- transaction
- intent
- providerReference
- providerPaymentUrl
- providerQrString
- idempotentReplay

Required endpoint 2 for dev/test only:

`POST /api/payment-engine/fake-gateway/confirm`

Body:

```json
{
  "provider_reference": "fake_xxx",
  "status": "succeeded"
}
```

Rules:

- Must use the same payment-engine authorization path already established.
- Must be disabled in production unless you explicitly protect it behind `PAYMENT_ENGINE_SERVICE_TOKEN` and document the behavior.
- Recommended: allow only when `NODE_ENV !== 'production'`.
- Return 404 for unknown provider reference.
- Return 422 for invalid transition.

Do not create `/webhooks/:provider` yet. That belongs to Phase 3.

---

## Task 6 — Repository Additions

Add repository methods as needed:

PaymentTransactionRepository should support:

- findByProviderReference(provider, providerReference, tenantId, tx?)
- update(id, tenantId, data, tx?)
- findByIdempotencyKey(tenantId, key, tx?) already exists

PaymentAllocationRepository already supports create with tx.

Keep tenant filtering mandatory.

---

## Task 7 — Tests

Add tests for:

1. Create fake gateway payment creates pending/requires_action transaction.
2. Pending gateway payment does not update `amountPaid`.
3. Pending gateway payment does not mark intent `paid`.
4. Idempotency replay returns same pending transaction.
5. Same idempotency key used on different intent returns conflict.
6. Unsupported provider returns clear error.
7. Confirm fake gateway as succeeded updates transaction to succeeded.
8. Successful confirmation creates default allocation.
9. Successful confirmation recalculates intent to paid when amount covers remaining.
10. Confirm fake gateway as failed does not increase amountPaid.
11. Confirm already succeeded transaction is rejected.
12. Fake confirm route is not available in production or is protected according to your chosen rule.
13. Existing manual payment tests still pass.
14. Existing DB-backed concurrency tests still pass if DB is available.

Prefer application-level unit tests plus one DB-backed integration test for pending→succeeded if practical.

---

## Task 8 — Report

Create:

- `docs/reports/payment-engine-phase-2-gateway-abstraction-report.md`

Report must include:

- summary
- files changed
- provider registry design
- FakeGatewayProvider behavior
- CreateGatewayPayment behavior
- fake confirmation behavior
- API endpoints added
- idempotency behavior
- security notes about fake confirmation route
- tests added/updated
- commands run
- known limitations
- confirmation that legacy order payment flow was not intentionally changed
- confirmation that real gateways/webhooks/order adapter/split bill/ledger/stock/PPOB/refund/void were not implemented

## Commands to run

Run available checks:

- `npm run check`
- payment engine unit tests
- DB-backed payment engine tests if available
- smoke test if practical with service token

If a command fails, report the exact relevant error summary.

## Commit

Commit all changes with a clear message, for example:

`feat(payment-engine): add gateway abstraction with fake provider`

Final Replit response must include:

- summary
- commit SHA
- files changed
- tests/checks run
- known issues
- confirmation that legacy order payment flow was not intentionally changed
