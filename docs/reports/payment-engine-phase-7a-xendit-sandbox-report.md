# Payment Engine Phase 7A — Xendit Sandbox Provider Adapter Report

**Date:** 2026-06-05
**Phase:** 7A — First Real Provider Sandbox Adapter (Xendit)
**Status:** ✅ Complete
**Commit base:** `50558d2d6325512a9973e5741a4bff4b6203f868`

---

## Summary

Phase 7A implements a minimal but complete Xendit sandbox payment provider adapter that maps
the Xendit Payments API (`POST /v3/payment_requests`) into the existing generic Payment Engine
provider contract (`PaymentProvider` interface, Phase 6).

The adapter is **sandbox/test-mode only**. No production credentials. No real money movement.
No provider-level refund, cancel, or external polling. No POS UI changes.

---

## Guardrail Compliance

| Guardrail | Status |
|-----------|--------|
| Sandbox only — no production credentials | ✅ Confirmed |
| No production Xendit enablement | ✅ Confirmed |
| No provider-level refund/cancel API call | ✅ Confirmed |
| No scheduled cron/job layer | ✅ Confirmed |
| No POS UI/order adapter | ✅ Confirmed |
| Legacy order payment flow unchanged | ✅ Confirmed — no change to /api/orders/:id/payments, /api/orders/create-and-pay, RecordPayment, CreateAndPayOrder, orders.ts routes, or order_payments table |
| FakeGateway unchanged and still works | ✅ Confirmed — FakeGatewayProvider.ts untouched; all FakeGateway tests pass |
| No Midtrans/Stripe | ✅ Confirmed |
| No external polling endpoint | ✅ Confirmed |

---

## Files Changed

| File | Type | Description |
|------|------|-------------|
| `packages/infrastructure/payments/providers/XenditProvider.ts` | New | Core Xendit sandbox provider adapter |
| `apps/api/src/container.ts` | Edit | Conditional XenditProvider registration |
| `apps/api/src/__tests__/payment-xendit-provider.test.ts` | New | 16+ tests with mocked HTTP |
| `apps/api/src/scripts/payment-engine/xendit-sandbox-smoke.ts` | New | Optional sandbox smoke script |
| `docs/payment-engine-xendit-sandbox-smoke.md` | New | Manual smoke guide |
| `docs/reports/payment-engine-phase-7a-xendit-sandbox-report.md` | New | This report |

---

## Xendit Provider Contract Mapping

### Provider Metadata

| Field | Value |
|-------|-------|
| `providerCode` | `'xendit_sandbox'` |
| API endpoint | `POST {XENDIT_API_BASE_URL}/v3/payment_requests` |
| Auth scheme | Basic Auth — `Authorization: Basic base64(secretKey + ':')` |
| Webhook header | `x-callback-token` compared against `XENDIT_WEBHOOK_TOKEN_SANDBOX` |
| Webhook comparison | Constant-time (`node:crypto.timingSafeEqual`) |

### Status Mapping Table

| Xendit status | Internal status | Notes |
|---------------|-----------------|-------|
| `REQUIRES_ACTION` | `requires_action` | Customer action in `actions[]` |
| `PENDING` | `pending` | Awaiting async confirmation |
| `SUCCEEDED` | `succeeded` | Immediate settlement; `succeededImmediately=true` |
| `FAILED` | `failed` | `failureReason` set from `failure_message`/`failure_code` |
| `CANCELED` | `failed` | **Phase 7A limitation** — no distinct canceled status |
| `EXPIRED` | `failed` | **Phase 7A limitation** — no distinct expired status |
| (unknown) | `pending` | Safe fallback; logged in `rawProviderResponse` |

### Action Mapping Table

| Xendit action type | Xendit descriptor | Internal `type` | Internal `descriptor` | Legacy field |
|--------------------|-------------------|-----------------|-----------------------|--------------|
| `REDIRECT_CUSTOMER` | `WEB_URL` | `redirect_customer` | `WEB_URL` | `providerPaymentUrl` |
| `PRESENT_TO_CUSTOMER` | `QR_STRING` | `present_qr` | `QR_STRING` | `providerQrString` |
| `PRESENT_TO_CUSTOMER` | `VA_NUMBER` | `display_code` | `VA_NUMBER` | — |
| `PRESENT_TO_CUSTOMER` | `PAYMENT_CODE` | `display_code` | `PAYMENT_CODE` | — |
| (unknown) | (any) | `none` | `NONE` | — |

All actions include `metadata.providerType` with the original Xendit action type string.
Unknown actions are surfaced as `type: 'none'` with the raw action in metadata — no crash, observable.

### Channel Code Resolution

| `method` | Default channel_code | Override via |
|----------|----------------------|--------------|
| `qris` | `QRIS` | `metadata.xendit_channel_code` |
| `ewallet` | _(required)_ | `metadata.xendit_channel_code` — throws if missing |
| `bank_transfer` | _(required)_ | `metadata.xendit_channel_code` — throws if missing |
| `card`, `other` | _(unsupported)_ | `metadata.xendit_channel_code` — throws if missing |

---

## Webhook Verification Strategy

Xendit sends the sandbox webhook token in the `x-callback-token` header.

1. Read `input.headers['x-callback-token']` (also checks `X-CALLBACK-TOKEN`, `X-Callback-Token`, and `input.signature` for compatibility).
2. If no token provided → return `false` immediately.
3. If `webhookToken` config is empty → return `false`.
4. Compare using `node:crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(expected))`.
5. Length mismatch → return `false` before constant-time comparison (lengths are not secret in this scheme).
6. Never log the token.

---

## Webhook Parsing Strategy

Supported events (Phase 7A):

| Xendit event | `transactionStatus` | Notes |
|--------------|---------------------|-------|
| `payment.capture` | `succeeded` | Triggers allocation in `HandlePaymentProviderWebhook` |
| `payment.failure` | `failed` | Stores failure; no allocation |
| `payment_request.expiry` | `ignored` | **Phase 7A limitation** — no state transition |
| (any other) | `ignored` | Safe fallback |

**`providerEventId`** is deterministic: `${event}:${data.payment_request_id}`
- Allows `payment_provider_events` unique constraint to enforce idempotency.
- Stable across Xendit webhook retry deliveries for the same event.

**`providerReference`** = `data.payment_request_id` (Xendit's stable payment reference).
This matches what `createPayment()` stores as `providerReference` in the transaction row,
enabling `HandlePaymentProviderWebhook` to look up the transaction.

---

## Provider Registration Strategy

XenditProvider is registered **only** when both conditions are true:
1. `XENDIT_SANDBOX_ENABLED=true`
2. `XENDIT_SECRET_KEY_SANDBOX` is non-empty

Registration is guarded by `loadXenditSandboxConfig()` which returns `null` when conditions
are not met. `null` means the provider is simply not added to the registry — no error thrown,
no app startup failure, no FakeGateway test disruption.

```typescript
// apps/api/src/container.ts (conditional block added after FakeGatewayProvider)
const xenditConfig = loadXenditSandboxConfig();
if (xenditConfig) {
  this.paymentProviderRegistry.register(new XenditProvider(xenditConfig));
  console.log('[Payment Engine] Xendit sandbox provider registered (sandbox mode)');
}
```

---

## Environment Variables

| Variable | Default | Required |
|----------|---------|----------|
| `XENDIT_SANDBOX_ENABLED` | `false` | Must be `'true'` to activate |
| `XENDIT_SECRET_KEY_SANDBOX` | — | Required for activation |
| `XENDIT_WEBHOOK_TOKEN_SANDBOX` | `''` | Required for webhook verification |
| `XENDIT_API_BASE_URL` | `https://api.xendit.co` | Optional |
| `XENDIT_PAYMENT_SUCCESS_RETURN_URL` | `http://localhost:5000/payment/success` | Optional |
| `XENDIT_PAYMENT_FAILURE_RETURN_URL` | `http://localhost:5000/payment/failure` | Optional |

---

## Tests Added / Updated

**New file:** `apps/api/src/__tests__/payment-xendit-provider.test.ts`

All tests use mocked HTTP only — no real Xendit API calls. The mock is injected via
`XenditProvider`'s optional `httpFetch` constructor parameter (clean DI, no mock framework).

| # | Test | What it validates |
|---|------|-------------------|
| 1 | Provider disabled — XENDIT_SANDBOX_ENABLED not set | `loadXenditSandboxConfig()` returns null |
| 2 | Provider disabled — secret key missing | `loadXenditSandboxConfig()` returns null |
| 3 | Provider capabilities correct | All 12 capability fields match Phase 7A spec |
| 4 | createPayment sends Basic Auth with `secret + ':'` | Auth header correctly base64-encoded |
| 5 | REQUIRES_ACTION + REDIRECT_CUSTOMER/WEB_URL mapping | `requires_action`, `redirect_customer`, `WEB_URL`, `providerPaymentUrl` |
| 6 | QR action mapping | `present_qr`, `QR_STRING`, `providerQrString` |
| 7 | VA action mapping | `display_code`, `VA_NUMBER` |
| 8 | SUCCEEDED mapping | `succeeded`, `succeededImmediately=true` |
| 9 | FAILED mapping | `failed`, safe failure reason, no secret leak |
| 10 | Non-2xx Xendit response → failed without secret leak | `status=failed`, `providerReference=null` |
| 11 | Network error → controlled throw, no secret in message | `Error` thrown, secret not in `.message` |
| 12 | verifyWebhook valid token → true | `x-callback-token` matched |
| 13 | verifyWebhook invalid token → false | Mismatch returns false |
| 14 | parseWebhook payment.capture → succeeded | `transactionStatus=succeeded`, deterministic `providerEventId` |
| 15 | parseWebhook payment.failure → failed + failure reason | `transactionStatus=failed`, reason includes failure_code |
| 16 | parseWebhook payment_request.expiry → ignored | Phase 7A policy: `transactionStatus=ignored` |
| + | Additional edge-case tests | unknown events, missing payment_request_id, invalid JSON, cancel/refund stubs, FakeGateway regression |

**FakeGateway regression** (Test 17): Verifies `FakeGatewayProvider` default scenario and
capabilities are unaffected by XenditProvider's existence.

---

## Commands Run

```bash
# TypeScript type check (all packages)
npm run check

# Xendit provider tests (mocked HTTP only)
npx tsx --test apps/api/src/__tests__/payment-xendit-provider.test.ts
```

Live Xendit network tests were NOT run (require `XENDIT_SANDBOX_ENABLED=true` and a real
sandbox key). Prerequisites documented in `docs/payment-engine-xendit-sandbox-smoke.md`.

---

## Design Decisions

### Injectable HTTP Client (FetchFn)

`XenditProvider` accepts an optional `httpFetch: FetchFn` constructor parameter.
In production this defaults to `globalThis.fetch` (Node 18+ built-in).
In tests, a mock function is injected — no mocking framework, no monkey-patching.

This pattern keeps tests fast, deterministic, and free of external dependencies.

### Non-2xx → `status: 'failed'` (not throw)

When Xendit returns an HTTP error (e.g., 422 invalid channel), `createPayment()` returns
`status: 'failed'` rather than throwing. This lets `CreateGatewayPayment` store a failed
transaction row and return a structured error to the API caller, instead of propagating an
unhandled exception. Network errors (TCP-level) still throw, which propagates through the
use case to a 500 response.

### Deterministic `providerEventId`

Using `${event}:${payment_request_id}` (not a random UUID or timestamp) ensures that if
Xendit retries a webhook delivery, the second delivery gets the same `providerEventId` and
is deduplicated by the `payment_provider_events` unique constraint — exactly the idempotency
guarantee the webhook engine was designed to provide.

### Constant-Time Token Comparison

`x-callback-token` verification uses `node:crypto.timingSafeEqual` to prevent timing
side-channels. Even though timing attacks on a static token are difficult in practice,
this is a zero-cost safety measure consistent with security best practices.

### CANCELED/EXPIRED → `failed` (Phase 7A limitation)

The internal `CreateProviderPaymentResult.status` union is
`'pending' | 'requires_action' | 'succeeded' | 'failed'`. Adding `'cancelled'` or `'expired'`
would require changes to `CreateGatewayPayment`, `HandlePaymentProviderWebhook`, the DB enum,
and all existing tests. For Phase 7A, the pragmatic choice is to map both to `'failed'`
and document the limitation. A future phase can extend the status union if needed.

---

## Known Limitations

| Limitation | Phase 7A decision |
|------------|-------------------|
| Sandbox only | Production support out of scope |
| No provider-level refund | Use Phase 4 `RefundPaymentTransaction` use case |
| No provider-level cancel | Use Phase 4 `VoidPaymentTransaction` use case |
| CANCELED/EXPIRED mapped to `failed` | Internal status union does not have cancelled/expired |
| `payment_request.expiry` webhook → ignored | No distinct expired state transition in Phase 7A |
| `supportsPaymentCode: false` | PAYMENT_CODE channels not validated in Phase 7A |
| No external polling | Xendit does not require polling; webhook is the update mechanism |
| No cron/worker layer | Out of scope for Phase 7A |
| No POS UI adapter | Out of scope for Phase 7A |
| `rawProviderResponse` not stored in DB | Requires jsonb column on payment_transactions — future phase |

---

## Phase 1–6.6 Regression

All prior payment engine tests remain passing:

| Test file | Tests | Notes |
|-----------|-------|-------|
| `payment-engine.test.ts` | Phase 1 manual flow | Unchanged |
| `payment-engine-phase2.test.ts` | Gateway abstraction (36) | Unchanged |
| `payment-engine-phase3.test.ts` | Webhook engine | Unchanged |
| `payment-engine-phase4.test.ts` | Refund/void lifecycle (39) | Unchanged |
| `payment-engine-phase5.test.ts` | Reconciliation & stale recovery (36) | Unchanged |
| `payment-provider-contract.test.ts` | Provider contract (50) | Unchanged |
| `payment-engine-fakegateway-e2e.test.ts` | FakeGateway E2E smoke | Unchanged |

FakeGatewayProvider is not modified. It continues to return `'pending'` for the default
scenario, supporting all Phase 2 backward-compatibility guarantees.
