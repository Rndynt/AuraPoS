# Payment Engine — Phase 6.5 FakeGateway E2E Smoke & Dev Testing Report

**Date:** 2025-12-05
**Phase:** 6.5 — FakeGateway End-to-End Smoke & Dev Testing
**Status:** ✅ Complete

---

## Summary

Phase 6.5 establishes the full development and testing surface for FakeGateway — the local
golden contract provider built into the Payment Engine. This phase does not add new production
features; it validates that all FakeGateway scenarios, lifecycle flows, auth guards, and
production safety guarantees introduced in Phases 2–6 work correctly as an integrated whole.

---

## What FakeGateway Is

`FakeGatewayProvider` is a local dev/test-only simulated payment gateway. It:
- Exercises every provider action type (`WEB_URL`, `QR_STRING`, `VA_NUMBER`, `PAYMENT_CODE`, none)
- Simulates immediate success and immediate failure (Phase 6 Hardening paths)
- Is the **golden contract provider**: all future real-gateway adapters (Midtrans, Xendit, Stripe)
  must produce results compatible with FakeGateway's contract

**FakeGateway is NOT** a Midtrans, Xendit, or Stripe emulator. It is permanently disabled
(`404`) in `NODE_ENV=production`.

---

## Tasks Completed

### Task 1 — Curl / HTTP Smoke Documentation

**File:** `docs/payment-engine-fakegateway-e2e-smoke.md`

Created comprehensive curl documentation covering:
- All 8 FakeGateway scenarios with exact expected responses
- All 15 endpoint flows (create intent → gateway payment → confirm/webhook → void/refund → reconciliation)
- State transition table
- Auth requirements (service token vs HMAC webhook)
- Known limitations
- Environment variable requirements

### Task 2 — HTTP Smoke Script

**File:** `apps/api/src/scripts/payment-engine/fakegateway-smoke.ts`

Created a runnable end-to-end HTTP smoke script:
- Requires `PAYMENT_ENGINE_SMOKE_TEST=true` to prevent accidental execution
- Hard-disabled if `NODE_ENV=production`
- Requires `PAYMENT_ENGINE_SERVICE_TOKEN` (32+ chars)
- Auto-creates a `fakegateway-smoke` tenant in the DB if needed
- Tests all 8 FakeGateway scenarios plus confirm flows
- Tests void, refund, and all 4 reconciliation endpoints
- Tests auth guards (wrong token, no token)
- Prints a formatted summary table
- Exits non-zero on any failure

**Run command:**
```bash
PAYMENT_ENGINE_SMOKE_TEST=true \
PAYMENT_ENGINE_SERVICE_TOKEN="my-dev-smoke-test-token-32chars-min" \
node_modules/.bin/tsx --tsconfig apps/api/tsconfig.node.json \
apps/api/src/scripts/payment-engine/fakegateway-smoke.ts
```

#### npm Script Note

Per the project's `fullstack-js` skill guidelines, `package.json` must not be edited by the
agent. Therefore, the `payment:fakegateway:smoke` npm script was **not added** to `package.json`.

To add it manually, insert the following into the `"scripts"` section of `package.json`:

```json
"payment:fakegateway:smoke": "node_modules/.bin/tsx --tsconfig apps/api/tsconfig.node.json apps/api/src/scripts/payment-engine/fakegateway-smoke.ts"
```

And run it as:
```bash
PAYMENT_ENGINE_SMOKE_TEST=true \
PAYMENT_ENGINE_SERVICE_TOKEN="..." \
npm run payment:fakegateway:smoke
```

### Task 3 — In-Memory E2E Unit Tests

**File:** `apps/api/src/__tests__/payment-engine-fakegateway-e2e.test.ts`

Created 22 tests in 15 suites using the in-memory repository pattern (no live DB or HTTP server).

| Suite | Tests | Result |
|---|---|---|
| scenario: qris | 1 | ✅ |
| scenario: redirect | 1 | ✅ |
| scenario: va | 1 | ✅ |
| scenario: payment_code | 1 | ✅ |
| scenario: default (backward compat) | 1 | ✅ |
| ConfirmFakeGatewayPayment succeeded | 1 | ✅ |
| ConfirmFakeGatewayPayment failed | 1 | ✅ |
| scenario: immediate_success | 1 | ✅ |
| scenario: immediate_failure | 1 | ✅ |
| scenario: pending_expiry | 1 | ✅ |
| VoidPaymentTransaction | 3 | ✅ |
| RefundPaymentTransaction | 2 | ✅ |
| ReconcilePaymentIntentTotals dry-run | 2 | ✅ |
| Production guard for /fake-gateway/confirm | 3 | ✅ |
| ConfirmFakeGatewayPayment error cases | 2 | ✅ |
| **Total** | **22** | **✅ 22/22** |

**Key assertions verified:**
- Each scenario produces the correct `status`, `descriptor`, and `value` in `providerActions`
- `immediate_success` creates exactly one tx row (no two-step pending→succeeded), creates one allocation, and marks intent `paid` atomically
- `immediate_failure` creates one tx row with `failureReason` set, creates no allocation, leaves intent `requires_payment`
- `pending_expiry` sets `expiresAt` on the action (> `new Date()`)
- Void: pending and `requires_action` tx can be voided; already-succeeded tx cannot be voided (`INVALID_TRANSITION` from the VoidPaymentTransaction guard)
- Refund: succeeded tx can be refunded; pending tx cannot be refunded (`TRANSACTION_NOT_FOUND` from the RefundPaymentTransaction guard)
- ReconcilePaymentIntentTotals dry-run returns a result without mutating the stored intent
- Production guard: `NODE_ENV=production` causes the confirm route and webhook route guards to fire without calling `next()`

**Root cause documented during implementation:**

A subtle in-memory repo bug was discovered: the real `VoidPaymentTransactionInput` uses the field
name `transactionId`, while `RefundPaymentTransactionInput` also uses `transactionId`. Tests that
passed wrong field names (`paymentTransactionId`) silently failed with `TRANSACTION_NOT_FOUND`.
This was caught and corrected; the correct input interface field names are now verified by the tests.

### Task 4 — npm Script

Documented above (Task 2 note). Not added to `package.json` per project guidelines.

### Task 5 — Container.ts Stale Comment Fix

**File:** `apps/api/src/container.ts`

**Problem:** The Phase 3 comment block listed `CreateGatewayPayment` as one of the consumers of
`ApplyGatewayTransactionStatus`:

```typescript
// ApplyGatewayTransactionStatus is the shared atomic helper used by:
//  - ConfirmFakeGatewayPayment (dev/test controlled confirmation endpoint)
//  - HandlePaymentProviderWebhook (generic webhook handler)
//  - CreateGatewayPayment (Phase 6: immediate success path)   ← STALE
```

**Why this was wrong:** Phase 6 Hardening refactored `CreateGatewayPayment` to perform direct
settlement (via `PaymentAllocationRepository` + `RecalculatePaymentIntent`) instead of delegating
to `ApplyGatewayTransactionStatus`. This eliminated the intent→tx→intent reversed lock ordering
that the two-step approach would have created.

**Fix applied:** Removed the stale bullet and added an explanation of the correct pattern:

```typescript
// ApplyGatewayTransactionStatus is the shared atomic helper used by:
//  - ConfirmFakeGatewayPayment (dev/test controlled confirmation endpoint)
//  - HandlePaymentProviderWebhook (generic webhook handler)
// NOTE: CreateGatewayPayment does NOT use ApplyGatewayTransactionStatus.
// Its immediate-success path does direct settlement via PaymentAllocationRepository
// + RecalculatePaymentIntent inside the same DB transaction, avoiding the
// intent→tx→intent reversed lock ordering that the two-step approach would cause.
// (See Phase 6 Hardening report for the full lock-order analysis.)
```

### Task 6 — This Report

**File:** `docs/reports/payment-engine-phase-6-5-fakegateway-e2e-report.md`

---

## Test Execution Results

### Phase 6.5 E2E Tests (new)

```
apps/api/src/__tests__/payment-engine-fakegateway-e2e.test.ts

tests 22  suites 15  pass 22  fail 0  duration_ms ~836
```

### Regression — Phase 2 (Gateway Abstraction)

```
apps/api/src/__tests__/payment-engine-phase2.test.ts

tests 45  suites 8  pass 45  fail 0  duration_ms ~757
```

### Regression — Phase 4 (Refund / Void)

```
apps/api/src/__tests__/payment-engine-phase4.test.ts

tests 39  suites 5  pass 39  fail 0  duration_ms ~737
```

### Regression — Phase 5 (Reconciliation & Stale Recovery)

```
apps/api/src/__tests__/payment-engine-phase5.test.ts

tests 36  suites 5  pass 36  fail 0  duration_ms ~760
```

**All regression suites pass. No regressions introduced.**

---

## FakeGateway Scenario Coverage Matrix

| Scenario | Status produced | `providerActions[0].descriptor` | `immediateSuccess` | Allocation created | Tested |
|---|---|---|---|---|---|
| `default` | `pending` | (empty) | false | no | ✅ |
| `redirect` | `requires_action` | `WEB_URL` | false | no | ✅ |
| `qris` | `requires_action` | `QR_STRING` | false | no | ✅ |
| `va` | `requires_action` | `VA_NUMBER` | false | no | ✅ |
| `payment_code` | `requires_action` | `PAYMENT_CODE` | false | no | ✅ |
| `immediate_success` | `succeeded` | (empty) | true | yes | ✅ |
| `immediate_failure` | `failed` | (empty) | false | no | ✅ |
| `pending_expiry` | `requires_action` | `WEB_URL` + `expiresAt` | false | no | ✅ |

---

## Lifecycle Flow Coverage

| Flow | Tested (unit) | Tested (script) |
|---|---|---|
| Create intent | ✅ | ✅ |
| Gateway payment — all 8 scenarios | ✅ | ✅ |
| Fake confirm succeeded | ✅ | ✅ |
| Fake confirm failed | ✅ | ✅ |
| Fake confirm unknown ref → TRANSACTION_NOT_FOUND | ✅ | ✅ |
| Double-confirm terminal tx → INVALID_TRANSITION | ✅ | ✅ |
| Void pending tx | ✅ | ✅ |
| Void requires_action tx | ✅ | ✅ |
| Cannot void succeeded tx | ✅ | — |
| Refund succeeded tx | ✅ | ✅ |
| Cannot refund pending tx | ✅ | — |
| Reconciliation dry-run (reprocess, expire, reconcile, stale list) | ✅ | ✅ |
| Auth guard: wrong token → 401 | — | ✅ |
| Auth guard: no auth → 401 | — | ✅ |
| Production guard: confirm → 404 | ✅ | — |
| Production guard: webhook → 404 | ✅ | — |

---

## Files Created / Modified

| File | Type | Action |
|---|---|---|
| `docs/payment-engine-fakegateway-e2e-smoke.md` | Documentation | Created |
| `apps/api/src/scripts/payment-engine/fakegateway-smoke.ts` | Script | Created |
| `apps/api/src/__tests__/payment-engine-fakegateway-e2e.test.ts` | Tests | Created |
| `apps/api/src/container.ts` | Source | Stale comment fixed |
| `docs/reports/payment-engine-phase-6-5-fakegateway-e2e-report.md` | Report | Created |

---

## Known Limitations & Future Work

1. **npm script not added to `package.json`** — per project guidelines; must be added manually (see Task 2 note).

2. **Smoke script requires running server** — `fakegateway-smoke.ts` is an HTTP script that talks to a live server. It cannot run in CI without a running `npm run dev` process (or a dedicated test server workflow).

3. **Webhook signature test not in HTTP smoke** — the HMAC-signed webhook flow is documented in curl docs but not exercised in the HTTP smoke script, because generating a correct HMAC from the script requires an extra Node.js subprocess. The unit test suite covers the HMAC logic via `FakeGatewayProvider.verifyWebhook` and `FakeGatewayProvider.computeSignature`.

4. **No provider-level cancel/refund** — `FakeGatewayProvider.canCancel = false`, `canRefund = false`. Provider-level cancel/refund API calls will be added when a real gateway adapter (Midtrans, Xendit, Stripe) is integrated in a future phase. Internal void/refund lifecycle (Phase 4) is fully operational.

5. **No `ProviderAccountConfig` table** — gateway credentials are currently sourced from env vars only. Multi-provider credential management will require a DB-backed config table in a future phase.

---

## Appendix: FakeGateway Provider Contract Summary

The following contract is what future real-gateway adapters must satisfy:

```typescript
interface CreateProviderPaymentResult {
  status: 'pending' | 'requires_action' | 'succeeded' | 'failed';
  actions: ProviderAction[];           // machine-readable action list
  providerReference: string;           // unique ID for this payment at the provider
  providerPaymentUrl: string | null;   // legacy URL field (may be null)
  providerQrString: string | null;     // legacy QR field (may be null)
  succeededImmediately: boolean;        // true iff status='succeeded' on create
  failureReason: string | null;
  expiresAt: Date | null;
  rawProviderResponse: Record<string, unknown>;
}

interface ProviderAction {
  type: 'redirect_customer' | 'present_qr' | 'display_code' | 'none';
  descriptor: 'WEB_URL' | 'QR_STRING' | 'VA_NUMBER' | 'PAYMENT_CODE' | 'NONE';
  label: string;
  value: string;
  expiresAt: Date | null;
}
```

Any adapter that returns a correctly shaped `CreateProviderPaymentResult` will integrate with the
Payment Engine without modification to the use-case layer.
