# Replit Agent Prompt — Payment Orchestration Phase 8D.1 + Phase 8E

Use this prompt in Replit Agent.

You are working in the AuraPoS repository.

This is a combined phase:

```text
Phase 8D.1 — Atomic Confirm + Idempotency Failure Policy
Phase 8E   — Standalone Webhook + Provider Event Wiring
```

Reviewed latest Phase 8D hardening commit:

```text
a868197b8b563bb54e2c28054de6b406cfe3f526
```

Read first:

- `docs/reports/phase-8d-hardening-report.md`
- `docs/reports/payment-orchestration-phase-8d-standalone-service-usecase-wiring-report.md`
- `docs/payment-orchestration-service-smoke-test.md`
- `docs/payment-orchestration-hybrid-standalone-architecture.md`
- `docs/replit-agent-payment-orchestration-phase-8d-hardening-prompt.md`

## Context

Phase 8D hardening closed most issues, but review found 2 remaining blockers:

1. `ConfirmFakeGatewayPayment` is still read-then-write and explicitly documents a TOCTOU race.
2. `CreateGatewayPayment` allows retry after a failed idempotency row but then reserves the same unique key again, which can conflict.

The user wants these small blockers fixed together with Phase 8E so the process does not take too long.

## Guardrails

Do not implement unrelated phases:

- no AuraPoS SDK consumption yet
- no embedded `/api/payment-engine` route deletion
- no POS UI changes
- no order adapter
- no split bill/customer ledger/stock reservation/PPOB
- no provider-level Xendit refund/cancel
- no Midtrans/Stripe adapter
- no scheduled cron/worker layer
- no platform settlement/payout
- no production credential manager

Do not intentionally modify legacy order payment flow:

- `/api/orders/:id/payments`
- `/api/orders/create-and-pay`
- `packages/application/orders/RecordPayment.ts`
- `packages/application/orders/CreateAndPayOrder.ts`
- `apps/api/src/http/routes/orders.ts`
- `order_payments`

Do not intentionally modify embedded AuraPoS payment runtime:

- `/api/payment-engine/...`
- `packages/application/payments/*`
- `packages/domain/payments/*`
- embedded FakeGateway/Xendit provider behavior
- embedded webhook/refund/void/reconciliation behavior

Allowed:

- Change standalone `apps/payment-orchestration-service`.
- Change `packages/payment-orchestration-core` interfaces/DTOs if needed.
- Change `packages/payment-orchestration-client-sdk` only if needed for new standalone webhook/status behavior.
- Add tests/docs/reports.

---

# Part A — Phase 8D.1 Required Fixes

## Task A1 — Atomic / conditional FakeGateway confirm

Current problem:

`ConfirmFakeGatewayPayment` still does read-before-write and documents TOCTOU race. That is not acceptable before standalone webhook work.

Required:

1. Add repository method to core `PaymentTransactionRepository`, for example:

```ts
markSucceededIfConfirmable(input: {
  id: string;
  merchantId: string;
}): Promise<{ transaction: StandalonePaymentTransactionDTO | null; changed: boolean }>;
```

2. Implement it in the real Drizzle repository with conditional update:

```sql
UPDATE payment_orchestration_transactions
SET status = 'succeeded', updated_at = now()
WHERE id = ?
  AND merchant_id = ?
  AND status IN ('requires_action', 'pending')
RETURNING *
```

3. Update in-memory test repositories to implement the same contract.

4. Update `ConfirmFakeGatewayPayment`:

- Load transaction for validation.
- If already `succeeded`, return `alreadyConfirmed: true` without updating totals.
- If status is not `requires_action` or `pending`, reject.
- Reload latest intent and reject `OVERPAYMENT_REJECTED` if tx amount exceeds current remaining.
- Call `markSucceededIfConfirmable`.
- Only update intent totals if `changed === true`.
- If `changed === false`, reload transaction:
  - if `succeeded`, return `alreadyConfirmed: true`;
  - otherwise reject `INVALID_TRANSACTION_STATUS`.

Best effort:

- If the repo already has a clean transaction helper, update transaction status and intent totals in one DB transaction.
- If not, conditional update is the required minimum.

Acceptance:

- Sequential confirm remains idempotent.
- Simulated double confirm cannot double-add amountPaid.
- Failed/cancelled/expired transaction cannot be confirmed.
- Overpayment at confirm time still rejected.

## Task A2 — Define idempotency failed-key policy

Current problem:

`CreateGatewayPayment` treats existing failed idempotency row as retryable and falls through to reserve the same unique key again.

Required policy for now:

```text
failed idempotency key is not reusable.
```

Behavior:

- existing `failed` + same key → throw `IDEMPOTENCY_PREVIOUSLY_FAILED` with HTTP 409.
- user/client must use a new idempotency key for a retry.
- do not attempt to insert/reserve the same key again.

Update tests:

- completed same hash replays;
- completed different hash conflicts;
- processing returns in progress;
- failed returns `IDEMPOTENCY_PREVIOUSLY_FAILED`;
- provider is not called on failed-key reuse.

---

# Part B — Phase 8E Standalone Webhook + Provider Event Wiring

## Main Phase 8E goal

Wire standalone webhook ingestion for `apps/payment-orchestration-service` using the standalone `payment_orchestration_provider_events` table and standalone transactions/intents.

Phase 8E should implement webhook ingestion for FakeGateway first. Xendit sandbox webhook may be added only if low-risk and it reuses existing verified parser safely. Phase success must not depend on live Xendit credentials.

Required route:

```text
POST /v1/webhooks/:provider
```

Provider acceptance for Phase 8E:

```text
fake_gateway required
xendit_sandbox optional/mock-only
```

## Task B1 — Provider webhook contract in core/service

Add or refine a standalone provider webhook contract, for example:

```ts
export interface ParsedProviderWebhookEvent {
  provider: string;
  providerEventId: string;
  providerReference?: string | null;
  eventType: string;
  status: 'succeeded' | 'failed' | 'cancelled' | 'expired' | 'ignored' | 'pending';
  rawPayload?: Record<string, unknown> | null;
  parsedPayload?: Record<string, unknown> | null;
}
```

Keep it standalone and merchant-centric. Do not introduce `tenantId`.

## Task B2 — Standalone FakeGateway webhook parser/verifier

Create a standalone FakeGateway webhook parser/verifier in service infrastructure, for example:

```text
apps/payment-orchestration-service/src/infrastructure/providers/FakeGatewayWebhookHandler.ts
```

Requirements:

- Dev/test only.
- Does not depend on embedded `/api/payment-engine` webhook code.
- Accepts payload with at least:

```json
{
  "event_id": "evt_fake_001",
  "provider_reference": "fake_ref_...",
  "event_type": "payment.succeeded",
  "status": "succeeded"
}
```

- Optional HMAC signing support using env:

```text
PAYMENT_ORCHESTRATION_FAKEGATEWAY_WEBHOOK_SECRET
```

If secret is configured, require header:

```text
x-fakegateway-signature
```

Use a deterministic HMAC SHA-256 over raw JSON body if raw body access is available. If raw body access is not available, use stable JSON stringification for dev/test and document limitation.

If secret is not configured in non-production, allow unsigned FakeGateway webhooks.

In production, unsigned FakeGateway webhook must be rejected or route disabled.

## Task B3 — Implement provider event repository methods fully enough

Use Phase 8C repository methods:

```text
reserveEvent
findByProviderEventId
assignMerchant
markProcessed
markFailed
findStalePending
```

Ensure standalone provider event behavior:

- unique `(provider, provider_event_id)` prevents duplicate event processing;
- duplicate webhook returns idempotent success when already processed;
- event initially may have `merchantId = null`;
- after provider reference resolves to a transaction/intent, assign merchant id;
- no cross-merchant mutation allowed.

If repository already implemented methods, harden them for idempotency and conflict behavior.

## Task B4 — Implement HandleStandaloneProviderWebhook use case

Create use case under:

```text
apps/payment-orchestration-service/src/application/use-cases/HandleProviderWebhook.ts
```

Flow:

1. Accept provider code, headers, body.
2. Validate provider exists and supports webhook parsing for Phase 8E.
3. Parse/verify event.
4. Reserve provider event by `(provider, providerEventId)`.
5. If duplicate already processed, return idempotent response without mutating transaction again.
6. Resolve transaction by `(provider, providerReference)`.
7. Resolve intent from transaction.
8. Assign provider event merchant id from transaction/intent merchant id.
9. Apply status mutation:

```text
succeeded -> confirm transaction as succeeded using the same atomic confirm path/conditional update
failed    -> mark transaction failed if it is still pending/requires_action
cancelled -> mark transaction cancelled if not terminal
expired   -> mark transaction expired if not terminal
ignored   -> mark event processed, no transaction mutation
```

10. Update intent totals only when transaction changes to succeeded in this call.
11. Mark provider event processed, or failed with safe error.
12. Return read model:

```json
{
  "eventId": "...",
  "provider": "fake_gateway",
  "providerReference": "..."," +
"
  "processingStatus": "processed",
  "transaction": { ... } | null,
  "intent": { ... } | null,
  "idempotentReplay": false
}
```

Important:

- Do not trust merchant id from request header for real provider webhooks.
- Merchant is resolved from transaction/providerReference.
- Do not require service token on webhook route; use provider-specific signature/callback verification instead.
- Webhook route must not use AuraPoS tenant middleware.

## Task B5 — Wire `/v1/webhooks/:provider`

Update `apps/payment-orchestration-service/src/routes/webhooks.ts`:

- Real implementation for FakeGateway webhook.
- Public route should not require service token if provider signature is used.
- If current app applies service-token auth globally to `/v1`, adjust route ordering so `/v1/webhooks/:provider` bypasses service-token auth and relies on webhook verification.
- Keep health/version unprotected.
- Keep all other `/v1` routes service-token protected.

Expected responses:

- 200 for processed event.
- 200 for duplicate already processed event with `idempotentReplay: true`.
- 400 for invalid payload.
- 401/403 for invalid signature when secret required.
- 404 for provider reference not found, while provider event should be marked failed.

## Task B6 — Tests

Add tests for Phase 8D.1 and 8E.

Preferred files:

```text
apps/api/src/__tests__/payment-orchestration-atomic-confirm.test.ts
apps/api/src/__tests__/payment-orchestration-standalone-webhook.test.ts
```

Or extend existing test files if cleaner.

Required coverage:

### 8D.1 tests

1. confirm already succeeded does not double-add.
2. conditional update prevents double-add when confirm called twice.
3. confirm rejects failed/cancelled/expired transactions.
4. confirm rejects overpayment after another payment reduced remaining amount.
5. failed idempotency key returns `IDEMPOTENCY_PREVIOUSLY_FAILED` and does not call provider.

### 8E webhook tests

1. FakeGateway webhook without service token can process in dev/test when no webhook secret configured.
2. FakeGateway webhook with invalid payload returns 400.
3. FakeGateway `payment.succeeded` updates transaction to succeeded and intent to paid.
4. Duplicate webhook event id does not double-add amountPaid.
5. Webhook resolves merchant from providerReference, not request header.
6. Webhook for unknown providerReference marks event failed and returns safe error.
7. Failed/cancelled/expired webhook updates transaction status safely and does not update amountPaid.
8. If webhook secret configured, missing/wrong signature rejected.
9. Other `/v1` routes remain service-token protected.
10. Existing Xendit sandbox integration test still passes.

No live Xendit call.

## Task B7 — Docs and reports

Create report:

```text
docs/reports/payment-orchestration-phase-8d1-8e-webhook-provider-wiring-report.md
```

Also, if previous hardening report currently exists as:

```text
docs/reports/phase-8d-hardening-report.md
```

rename or copy it to the consistent name:

```text
docs/reports/payment-orchestration-phase-8d-hardening-report.md
```

Do not delete the old one unless safe; if both remain, clearly mark the canonical report.

Update docs:

- `docs/payment-orchestration-hybrid-standalone-architecture.md`
- `docs/payment-orchestration-service-smoke-test.md`

Add webhook smoke section with FakeGateway curl example:

```bash
curl -X POST "$BASE_URL/v1/webhooks/fake_gateway" \
  -H "Content-Type: application/json" \
  -d '{
    "event_id":"evt_fake_001",
    "provider_reference":"...",
    "event_type":"payment.succeeded",
    "status":"succeeded"
  }'
```

Report must include:

- summary;
- files changed;
- 8D.1 atomic confirm fix;
- idempotency failed-key policy;
- webhook route auth model;
- FakeGateway webhook parser/verifier;
- provider event repository behavior;
- HandleProviderWebhook use case;
- tests and commands run with pass/fail/not-run;
- known limitations;
- explicit confirmation that no AuraPoS SDK consumption was implemented;
- explicit confirmation that embedded `/api/payment-engine/...` was not intentionally changed;
- explicit confirmation that legacy order payment was not intentionally changed;
- explicit confirmation that no provider-level refund/cancel was implemented;
- explicit confirmation that Xendit live webhook was not required.

---

# Commands to run

Run:

```bash
npm run check
pnpm --filter @northflow/payment-orchestration-core type-check
pnpm --filter @northflow/payment-orchestration-service type-check
pnpm --filter @northflow/payment-orchestration-client-sdk type-check
```

Run relevant tests:

```bash
npx tsx --tsconfig apps/api/tsconfig.node.json --test apps/api/src/__tests__/payment-orchestration-service-fakegateway-flow.test.ts
npx tsx --tsconfig apps/api/tsconfig.node.json --test apps/api/src/__tests__/payment-orchestration-service-http-auth.test.ts
npx tsx --tsconfig apps/api/tsconfig.node.json --test apps/api/src/__tests__/payment-orchestration-atomic-confirm.test.ts
npx tsx --tsconfig apps/api/tsconfig.node.json --test apps/api/src/__tests__/payment-orchestration-standalone-webhook.test.ts
npx tsx --tsconfig apps/api/tsconfig.node.json --test apps/api/src/__tests__/payment-orchestration-schema-mappers.test.ts
npx tsx --tsconfig apps/api/tsconfig.node.json --test apps/api/src/__tests__/payment-orchestration-core-contract-adapter.test.ts
npx tsx --tsconfig apps/api/tsconfig.node.json --test apps/api/src/__tests__/payment-xendit-gateway-integration.test.ts
```

Do not run live Xendit tests unless explicitly configured. Do not fake success; report exact failures.

---

# Acceptance criteria

1. FakeGateway confirm uses conditional update and cannot double-add payment totals.
2. Failed idempotency key has explicit non-reusable policy.
3. Standalone `/v1/webhooks/fake_gateway` processes succeeded webhook.
4. Duplicate webhook event does not double-add payment totals.
5. Provider event row is reserved, assigned merchant, marked processed/failed correctly.
6. Webhook resolves merchant from providerReference, not request tenant/merchant header.
7. Webhook route does not require service token but uses FakeGateway webhook verification policy.
8. Other `/v1` routes remain service-token protected.
9. No embedded payment route or legacy order payment flow changed intentionally.
10. Reports and smoke docs updated.

---

# Commit

Commit with a clear message, for example:

```text
feat(payment-orchestration): wire standalone webhooks and atomic confirm
```

Final Replit response must include summary, commit SHA, files changed, tests/checks run, known issues, and confirmations that no AuraPoS SDK consumption, embedded route deletion, legacy order payment changes, provider-level refund/cancel, or live Xendit webhook dependency was implemented.
