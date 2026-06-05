# Replit Agent Prompt — Payment Engine Phase 6.6 Dev UX + Smoke Hardening

Use this prompt in Replit Agent.

You are working in the AuraPoS repository.

This is **Payment Engine Phase 6.6: Refundability + Intent Status + FakeGateway HMAC HTTP Smoke**.

Important:

- This is still a pre-real-provider phase.
- Do not implement Xendit/Midtrans/Stripe adapter yet.
- Do not implement provider-level refund integration yet.
- Do not implement scheduled cron/job layer yet.
- Do not implement POS UI/order adapter yet.

Read first:

- `docs/payment-engine-roadmap.md`
- `docs/payment-engine-fakegateway-e2e-smoke.md`
- `docs/reports/payment-engine-phase-6-provider-contract-report.md`
- `docs/reports/payment-engine-phase-6-hardening-report.md`
- `docs/reports/payment-engine-phase-6-5-fakegateway-e2e-report.md`
- `docs/reports/payment-engine-phase-6-5-hardening-report.md`

Current accepted base:

- `a7652e424802a7a443a77d884ddd28bc6c0472a1`

## Guardrails

Do not intentionally change legacy order payment behavior:

- `/api/orders/:id/payments`
- `/api/orders/create-and-pay`
- `packages/application/orders/RecordPayment.ts`
- `packages/application/orders/CreateAndPayOrder.ts`
- `apps/api/src/http/routes/orders.ts`
- `order_payments` legacy table behavior

Do not implement future phases:

- no Xendit adapter
- no Midtrans adapter
- no Stripe adapter
- no real provider API call
- no real provider credentials
- no real provider refund/cancel API
- no scheduled cron/worker layer
- no external provider polling API
- no POS UI changes
- no order adapter
- no split bill
- no customer ledger
- no stock reservation
- no PPOB wallet or credit
- no standalone extraction

## Main goal

Add small read-only/helper endpoints and complete FakeGateway HMAC HTTP smoke coverage before real provider sandbox integration.

Phase 6.6 must implement:

1. A read-only refundability endpoint for POS UI pre-checks.
2. A unified read-only intent status endpoint for frontend polling.
3. FakeGateway HMAC webhook flow in the HTTP smoke script.
4. Tests and report.

---

## Task 1 — Add refundability use case

Create:

- `packages/application/payments/GetPaymentIntentRefundability.ts`

Purpose:

Return how much of each succeeded incoming transaction is still refundable, so POS UI can show maximum refund amounts before cashier confirms refund.

Input:

```ts
{
  tenantId: string;
  paymentIntentId: string;
}
```

Rules:

- Tenant-scoped.
- Read-only.
- No DB mutation.
- Must not call provider APIs.
- Include only transactions belonging to the given payment intent and tenant.
- A transaction is refundable if:
  - direction = `incoming`
  - status = `succeeded`
  - transactionType in `payment`, `deposit`, `settlement`
  - refundableRemaining > 0
- For each refundable source transaction:
  - calculate already refunded amount using succeeded outgoing refund transactions where `parentTransactionId = sourceTx.id`.
  - `refundableRemaining = max(0, sourceTx.amount - refundedAmount)`.
- Non-refundable transactions may be included with `canRefund=false` and a reason, or omitted from the refundable list. Prefer including both `transactions` and `refundableTransactions` if useful.

Suggested response shape:

```ts
{
  intent: {
    id: string;
    status: string;
    amountDue: number;
    amountPaid: number;
    amountRefunded: number;
    amountRemaining: number;
    currency: string;
  };
  totalRefundable: number;
  transactions: Array<{
    transactionId: string;
    provider: string | null;
    method: string;
    transactionType: string;
    direction: string;
    status: string;
    amount: number;
    refundedAmount: number;
    refundableRemaining: number;
    canRefund: boolean;
    reason?: string;
    providerReference?: string | null;
    createdAt?: Date;
  }>;
}
```

Repository additions if needed:

- Reuse existing `findByIntentId` / `findAllByIntentIds` / `sumRefundedForParent`.
- Avoid N+1 query if practical by loading all intent transactions and computing refunds in memory.

Acceptance tests:

1. Full paid transaction returns full refundable amount.
2. Partial refund reduces `refundableRemaining`.
3. Full refund returns zero refundable for that source transaction.
4. Failed/pending/voided/outgoing transactions are not refundable.
5. Tenant isolation works.
6. Intent not found returns 404/application error.

---

## Task 2 — Add refundability API endpoint

Add route under existing payment engine routes:

```text
GET /api/payment-engine/intents/:id/refundability
```

Security:

- Use existing payment engine operator guard.
- Read-only, but still tenant-scoped.
- Do not expose across tenants.

Error mapping:

- intent not found: 404
- validation error: 400
- unauthorized: existing behavior

Do not call external provider APIs.

---

## Task 3 — Add unified intent status use case

Create:

- `packages/application/payments/GetPaymentIntentStatus.ts`

Purpose:

Provide a stable frontend polling endpoint for POS UI/payment screen without waiting for push/websocket. This endpoint reads Payment Engine state only. It does **not** poll external providers.

Input:

```ts
{
  tenantId: string;
  paymentIntentId: string;
}
```

Rules:

- Tenant-scoped.
- Read-only.
- No mutation.
- No provider API calls.
- Return current payment intent aggregate.
- Return latest transaction or latest active transaction.
- Return provider actions if available from transaction metadata/raw output if currently persisted, but do not overbuild. If actions are not persisted yet, return empty array and document it.
- Include enough fields for frontend polling:
  - intent id/status/amountDue/amountPaid/amountRefunded/amountRemaining/currency/updatedAt
  - latest transaction id/status/provider/method/providerReference/providerPaymentUrl/providerQrString/failureReason/createdAt/updatedAt
  - `isTerminal` boolean for intent
  - `requiresAction` boolean if latest transaction status is `requires_action`
  - `canRetryPayment` boolean if intent still has amount remaining and is not terminal

Suggested response shape:

```ts
{
  intent: {
    id: string;
    status: string;
    amountDue: number;
    amountPaid: number;
    amountRefunded: number;
    amountRemaining: number;
    currency: string;
    updatedAt: Date;
  };
  latestTransaction: {
    id: string;
    status: string;
    provider: string | null;
    method: string;
    providerReference?: string | null;
    providerPaymentUrl?: string | null;
    providerQrString?: string | null;
    failureReason?: string | null;
    createdAt: Date;
    updatedAt: Date;
  } | null;
  providerActions: unknown[];
  isTerminal: boolean;
  requiresAction: boolean;
  canRetryPayment: boolean;
}
```

Important naming:

- Use payment-engine route namespace only.
- Do not create duplicate `/api/payments/...` route.

---

## Task 4 — Add intent status API endpoint

Add route:

```text
GET /api/payment-engine/intents/:id/status
```

Security:

- Use existing payment engine operator guard.
- Tenant-scoped.
- Read-only.

Error mapping:

- intent not found: 404
- validation error: 400

Acceptance tests:

1. Newly created intent returns `requires_payment`, no latest transaction, `canRetryPayment=true`.
2. Requires-action FakeGateway transaction returns `requiresAction=true` and latest transaction status `requires_action`.
3. Confirmed succeeded payment returns intent `paid`, latest transaction `succeeded`, `isTerminal=true` or terminal according to current domain policy.
4. Failed transaction returns latest transaction `failed`, `canRetryPayment=true` if remaining amount > 0.
5. Tenant isolation works.

---

## Task 5 — Add FakeGateway HMAC webhook HTTP smoke step

Update:

- `apps/api/src/scripts/payment-engine/fakegateway-smoke.ts`

Add live HTTP smoke flow for HMAC signed fake webhook.

Flow:

1. Create a fresh intent.
2. Create a FakeGateway default or qris payment.
3. Extract `providerReference` and transaction id.
4. Build webhook body with deterministic `event_id`, event type succeeded, provider reference, amount/currency if required by parser.
5. Compute HMAC-SHA256 signature using `FAKE_GATEWAY_WEBHOOK_SECRET` or the same default dev secret used by FakeGateway.
6. POST to:

```text
POST /api/payment-engine/webhooks/fake_gateway
```

7. Do not send service token/session header to webhook route.
8. Assert response success.
9. Query intent status endpoint or list transaction to verify transaction succeeded and intent paid.
10. Send the same webhook again with the same event id.
11. Assert duplicate webhook is idempotent and does not create duplicate allocation / does not change amountPaid beyond the transaction amount.
12. Send an invalid-signature webhook.
13. Assert it is rejected or handled according to existing webhook behavior, and does not mutate money movement.

Important:

- Keep this non-production only.
- Respect existing `NODE_ENV=production` guards.
- If existing fake webhook parser requires a specific payload shape, follow the actual parser, not guessed docs.

Acceptance:

- Smoke script now covers HMAC signed fake webhook over HTTP.
- Smoke docs updated with runnable command/payload.
- Report updated.

---

## Task 6 — Update documentation

Update:

- `docs/payment-engine-fakegateway-e2e-smoke.md`

Add sections for:

1. `GET /api/payment-engine/intents/:id/refundability`
2. `GET /api/payment-engine/intents/:id/status`
3. FakeGateway HMAC webhook smoke flow now covered by script.

Make sure examples use existing headers correctly:

- normal payment-engine endpoints: service token/session + tenant header.
- webhook endpoint: HMAC signature only, no service token.

---

## Task 7 — Tests

Add or update tests for:

Refundability:

1. full paid transaction refundable amount;
2. partial refund reduces refundable amount;
3. full refund zeroes refundable amount;
4. pending/failed/outgoing tx not refundable;
5. tenant isolation;
6. not found behavior.

Intent status:

7. requires_payment with no transaction;
8. requires_action latest transaction;
9. paid after fake confirm;
10. failed payment and retry eligibility;
11. tenant isolation.

FakeGateway HMAC HTTP smoke:

12. Unit/in-memory HMAC verification already exists, but update smoke script coverage.
13. Add a test if practical for webhook duplicate idempotency using existing use case/repositories.

Regression:

14. Phase 6.5 FakeGateway E2E tests still pass.
15. Phase 1-6 payment engine tests still pass if practical.

---

## Task 8 — Report

Create:

- `docs/reports/payment-engine-phase-6-6-dev-ux-smoke-report.md`

Report must include:

- summary;
- files changed;
- refundability endpoint design;
- intent status endpoint design;
- FakeGateway HMAC HTTP smoke coverage;
- tests added/updated;
- commands run;
- known limitations;
- explicit confirmation that status endpoint does not poll external providers;
- explicit confirmation that provider refund integration was not implemented;
- explicit confirmation that scheduled cron/job layer was not implemented;
- explicit confirmation that FakeGateway is not a Midtrans/Xendit emulator;
- explicit confirmation that no real provider adapter/API/credential was implemented;
- explicit confirmation that legacy order payment flow was not intentionally changed;
- explicit confirmation that future phases were not implemented.

---

## Commands to run

Run available checks:

- `npm run check`
- new Phase 6.6 tests
- Phase 6.5 FakeGateway E2E tests
- provider contract tests if practical
- Phase 1-6 payment engine regression tests if practical

If the HTTP smoke script cannot be run because no live server/service token is available, report it as not run. Do not fake success.

## Commit

Commit with a clear message, for example:

`feat(payment-engine): add refundability status and webhook smoke coverage`

Final Replit response must include summary, commit SHA, files changed, tests/checks run, known issues, and confirmation that legacy order payment flow was not intentionally changed.
