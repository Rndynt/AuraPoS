# Payment Engine Phase 6.6 — Dev UX + Smoke Report

**Date:** 2026-06-05
**Phase:** 6.6 — Refundability + Intent Status + FakeGateway HMAC Webhook HTTP Smoke

---

## Summary

Phase 6.6 adds three capabilities to the Payment Engine that unblock the POS terminal UI
from having to call `ListPaymentTransactions` + compute state client-side:

1. **`GetPaymentIntentRefundability`** — a read-only use case and `GET` endpoint that computes
   per-transaction refundable amounts in one DB round-trip (no N+1) using an in-memory
   reduce over the already-loaded transaction list.

2. **`GetPaymentIntentStatus`** — a read-only use case and `GET` endpoint designed as a stable
   polling target for the payment screen. Returns the intent state, the latest transaction
   snapshot, and three derived boolean flags (`isTerminal`, `requiresAction`, `canRetryPayment`)
   so the POS UI can drive its state machine without recomputing anything.

3. **FakeGateway HMAC Webhook HTTP Smoke** — the `fakegateway-smoke.ts` script now
   exercises the `POST /api/payment-engine/webhooks/fake_gateway` endpoint over real HTTP,
   computing a valid HMAC-SHA256 signature in-process and verifying:
   - successful webhook processing (`outcome=processed`)
   - idempotent replay prevention (`outcome=idempotent_replay` for duplicate `event_id`)
   - invalid-signature rejection (`401`)

---

## Deliverables

| Deliverable | File | Type |
|---|---|---|
| Refundability use case | `packages/application/payments/GetPaymentIntentRefundability.ts` | New |
| Intent status use case | `packages/application/payments/GetPaymentIntentStatus.ts` | New |
| DI container wiring | `apps/api/src/container.ts` | Modified |
| Controller handlers | `apps/api/src/http/controllers/PaymentEngineController.ts` | Modified |
| Route registration | `apps/api/src/http/routes/payment-engine.ts` | Modified |
| Unit/integration tests | `apps/api/src/__tests__/payment-engine-phase6-6.test.ts` | New |
| HMAC webhook smoke | `apps/api/src/scripts/payment-engine/fakegateway-smoke.ts` | Modified |
| Smoke docs (flows 12–14) | `docs/payment-engine-fakegateway-e2e-smoke.md` | Modified |
| This report | `docs/reports/payment-engine-phase-6-6-dev-ux-smoke-report.md` | New |

---

## New Endpoints

### `GET /api/payment-engine/intents/:id/status`

**Purpose:** Stable polling endpoint for POS payment screen.

**Auth:** `requirePaymentOperator` (service token OR cashier session).

**Response shape:**
```json
{
  "success": true,
  "data": {
    "intent": { "id", "status", "amountDue", "amountPaid", "amountRefunded", "amountRemaining", "currency", "updatedAt" },
    "latestTransaction": { "id", "status", "provider", "method", "providerReference", "providerPaymentUrl", "providerQrString", "failureReason", "createdAt", "updatedAt" } | null,
    "providerActions": [],
    "isTerminal": boolean,
    "requiresAction": boolean,
    "canRetryPayment": boolean
  }
}
```

**Boolean flag semantics:**

| Flag | `true` when | UI action |
|---|---|---|
| `isTerminal` | `status ∈ { paid, refunded, cancelled, expired }` | Show completion screen |
| `requiresAction` | latest tx `status = requires_action` | Show QR / VA / redirect waiting screen |
| `canRetryPayment` | `amountRemaining > 0 && !isTerminal` | Show "Retry Payment" button |

**Known gap:** `providerActions` is always `[]`. Action descriptors (QR codes, VA numbers,
redirect URLs) are not yet persisted in the DB; they are returned live from
`createGatewayPayment` only. Planned for a future phase.

---

### `GET /api/payment-engine/intents/:id/refundability`

**Purpose:** Read-only pre-check before presenting the refund screen to a cashier.

**Auth:** `requirePaymentOperator` (service token OR cashier session).

**Design decisions:**
- Loads all intent transactions in a **single query** (`findByIntentId`).
- Computes already-refunded totals **in memory** from the same result set using a
  `Map<parentId, sum>` reduce — no N+1 queries to `sumRefundedForParent`.
- Returns a `reason` string on non-refundable transactions for UI tooltip display.

**Refundability rules:**

A transaction row is eligible for a (further) refund when:
- `direction = incoming`
- `status = succeeded`
- `transactionType ∈ { payment, deposit, settlement }`
- `refundableRemaining > 0` (i.e., not yet fully refunded)

**Response shape:**
```json
{
  "success": true,
  "data": {
    "intent": { "id", "status", "amountDue", "amountPaid", "amountRefunded", "amountRemaining", "currency" },
    "totalRefundable": number,
    "transactions": [
      {
        "transactionId", "provider", "method", "transactionType", "direction", "status",
        "amount", "refundedAmount", "refundableRemaining",
        "canRefund": boolean,
        "reason": string | undefined,
        "providerReference", "createdAt"
      }
    ]
  }
}
```

---

## Test Coverage

`apps/api/src/__tests__/payment-engine-phase6-6.test.ts` — 11 tests (no live DB):

| # | Describe | Scenario |
|---|---|---|
| 1 | `GetPaymentIntentRefundability` | No txs → `totalRefundable=0`, empty list |
| 2 | `GetPaymentIntentRefundability` | Succeeded incoming payment → `canRefund=true`, amounts correct |
| 3 | `GetPaymentIntentRefundability` | Partial refund → `refundableRemaining = original - alreadyRefunded` |
| 4 | `GetPaymentIntentRefundability` | Fully refunded tx → `canRefund=false`, `reason='Fully refunded'` |
| 5 | `GetPaymentIntentRefundability` | Failed/pending/outgoing tx → `canRefund=false`, descriptive reason |
| 6 | `GetPaymentIntentRefundability` | Intent not found → throws |
| 7 | `GetPaymentIntentStatus` | No txs → `latestTransaction=null`, `canRetryPayment=true` |
| 8 | `GetPaymentIntentStatus` | `requires_action` tx → `requiresAction=true`, `isTerminal=false` |
| 9 | `GetPaymentIntentStatus` | Paid intent + succeeded tx → `isTerminal=true`, `canRetryPayment=false` |
| 10 | `GetPaymentIntentStatus` | Failed tx → `requiresAction=false`, `canRetryPayment=true` |
| 11 | `GetPaymentIntentStatus` | Intent not found → throws |

---

## Smoke Script Additions (Phase 6.6)

New sections added to `apps/api/src/scripts/payment-engine/fakegateway-smoke.ts`:

### Section A — HMAC Webhook HTTP smoke (4 steps)

| Step | Assertion |
|---|---|
| Setup: create intent + qris gateway payment | `providerReference` is set |
| `payment.succeeded` webhook → HMAC valid | `200`, `outcome=processed` |
| Same `event_id` re-send (idempotent replay) | Second call: `outcome=idempotent_replay` |
| Wrong HMAC signature | `401` |

**Implementation detail:** The smoke script imports `createHmac` from `node:crypto` at the
top and computes `HMAC-SHA256(rawBody, FAKE_GATEWAY_WEBHOOK_SECRET)` in-process — identical
to what `FakeGatewayProvider.verifyWebhook` does on the server side.

### Section B — `GET /intents/:id/status` (4 steps)

| Step | Assertion |
|---|---|
| Fresh intent (no txs) | `isTerminal=false`, `canRetryPayment=true`, `latestTransaction=null` |
| After HMAC webhook succeeded | `isTerminal=true`, `canRetryPayment=false`, `intent.status='paid'` |
| Intent with `requires_action` tx | `requiresAction=true`, `isTerminal=false` |
| Unknown intent ID | `404` |

### Section C — `GET /intents/:id/refundability` (4 steps)

| Step | Assertion |
|---|---|
| Fresh intent (no txs) | `totalRefundable=0`, `transactions=[]` |
| Paid intent (after webhook) | `totalRefundable=100000`, 1 refundable tx |
| After partial refund (25k) | `totalRefundable=75000`, `refundedAmount=25000` |
| Unknown intent ID | `404` |

---

## Architecture Notes

### No N+1 in `GetPaymentIntentRefundability`

Previous approach to compute "already refunded" amounts would have been:
```
For each incoming succeeded tx:
  → txRepo.sumRefundedForParent(txId, tenantId)  // N DB queries
```

Phase 6.6 approach:
```
1. Load all txs for intent in one query
2. Reduce outgoing refund txs into Map<parentId, sum>
3. Compute refundableRemaining in-memory
Total: 2 DB queries (findById + findByIntentId) regardless of tx count
```

### Intent Terminal Status Set

```ts
const TERMINAL_INTENT_STATUSES = new Set(['paid', 'refunded', 'cancelled', 'expired']);
```

`partially_refunded` is intentionally **not terminal** — the intent still has `amountRemaining=0`
but the amount is refunded partially; more refunds may still be issued. `canRetryPayment` is
false for `partially_refunded` because `amountRemaining=0` (not because `isTerminal=true`).

---

## Guardrails

All Phase 6.6 changes comply with the guardrails defined in the Phase 6.6 prompt:

- ✅ No changes to legacy order payment files
- ✅ No real provider adapters added or modified
- ✅ No cron / background worker changes
- ✅ No POS UI changes
- ✅ Both new endpoints are read-only (no DB mutations, no external calls)
- ✅ `npm run check` (Turborepo type-check) passes
