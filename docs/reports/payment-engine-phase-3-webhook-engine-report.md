# Payment Engine Phase 3 — Webhook / Event Engine Report

**Date:** 2026-06-04  
**Status:** ✅ Complete  
**Tests:** 76/76 pass (31 new Phase 3 + 45 Phase 2 regression)  
**TypeScript:** 0 errors (`npx tsc --noEmit`)

---

## Overview

Phase 3 implements a generic, idempotent webhook processing pipeline for inbound payment provider events. It is built entirely on the `fake_gateway` provider (the only supported provider in Phase 3) and establishes the infrastructure needed to add real gateway webhooks in Phase 5+.

No legacy order payment flow was modified. All Phase 1 and Phase 2 behavior is unchanged.

---

## Architecture

### New Classes

#### `ApplyGatewayTransactionStatus` (`packages/application/payments/ApplyGatewayTransactionStatus.ts`)

Shared atomic helper that encapsulates all transaction-mutation logic previously duplicated between `ConfirmFakeGatewayPayment` (Phase 2) and the new `HandlePaymentProviderWebhook`. It:

1. Acquires a `SELECT ... FOR UPDATE` row-level lock on `payment_transactions`.
2. Returns `not_found` if no matching row exists.
3. Returns `already_terminal` if the row is already in a terminal state (`succeeded`, `failed`, `cancelled`, `voided`, `refunded`).
4. Acquires a `SELECT ... FOR UPDATE` lock on `payment_intents`.
5. Mutates the transaction to `succeeded` or `failed`.
6. For `succeeded`: creates one `payment_allocation` row and recalculates intent totals.
7. Returns a typed `ApplyGatewayStatusOutcome` discriminated union.

**Lock ordering:** `payment_transactions` → `payment_intents`, consistent with all other payment use cases to prevent deadlocks.

**Must be called inside an active DB transaction** — it does not create its own top-level transaction.

#### `HandlePaymentProviderWebhook` (`packages/application/payments/HandlePaymentProviderWebhook.ts`)

Generic webhook processing use case. Processing pipeline:

1. Lookup provider in `PaymentProviderRegistry` → `unknown_provider` if absent.
2. Verify HMAC signature via `provider.verifyWebhook()` → `invalid_signature` if fails.
3. Parse raw payload via `provider.parseWebhook()` → `parse_error` on failure.
4. Idempotency check: find existing event by `(provider, providerEventId)`. If found and not `pending` → `idempotent_replay`.
5. Resolve `tenantId`: from route context if provided, else global TX lookup via `findByProviderReferenceGlobal`.
6. DB transaction:
   a. Insert `payment_provider_events` row.  Unique constraint handles concurrent duplicate delivery gracefully.
   b. For `ignored` / `pending` events → `markIgnored` → return `ignored`.
   c. Call `ApplyGatewayTransactionStatus.execute()`.
   d. `already_terminal` → `markIgnored(TRANSACTION_ALREADY_TERMINAL)` → `ignored`.
   e. `not_found` → `markFailed(TRANSACTION_NOT_FOUND)` → `ignored`.
   f. `succeeded` / `failed` → `markProcessed` → `processed`.

**Output type:** `HandlePaymentProviderWebhookOutput` — discriminated union with outcomes: `processed`, `idempotent_replay`, `ignored`, `invalid_signature`, `unknown_provider`, `parse_error`.

---

### Modified Classes

#### `FakeGatewayProvider` (`packages/infrastructure/payments/providers/FakeGatewayProvider.ts`)

Previously a stub for Phase 3. Now fully implements:

- **`verifyWebhook()`** — HMAC-SHA256 validation using the `x-fake-gateway-signature` header.
  - Secret resolution: `FAKE_GATEWAY_WEBHOOK_SECRET` env var → `DEFAULT_NON_PROD_SECRET` constant (non-prod only).
  - Always returns `false` in `NODE_ENV === 'production'` regardless of secret or signature.
- **`parseWebhook()`** — parses JSON payload; maps `event_type` to `transactionStatus`:
  - `payment.succeeded` → `succeeded`
  - `payment.failed` → `failed`
  - `payment.pending` → `pending`
  - anything else → `ignored`
- **`static computeSignature(rawPayload, secret?)`** — convenience helper for tests and dev tooling to generate valid signatures.

#### `ConfirmFakeGatewayPayment` (`packages/application/payments/ConfirmFakeGatewayPayment.ts`)

**Refactored** to delegate to `ApplyGatewayTransactionStatus` instead of duplicating the mutation logic. Constructor signature changed from 5 arguments to 2 (`db`, `applyGatewayTransactionStatus`). External behavior is identical — `not_found` and `already_terminal` outcomes are converted to thrown `PaymentPolicyError` to maintain Phase 2 API contract.

#### `PaymentProviderEventRepository` (`packages/infrastructure/repositories/payments/PaymentProviderEventRepository.ts`)

Extended with:
- `tx?` parameter on `create` and `findByProviderEventId` for transactional use.
- `markProcessed(id, data?, tx?)` — sets `processingStatus = 'processed'`, `processedAt = now()`.
- `markFailed(id, errorMessage, tx?)` — sets `processingStatus = 'failed'`, `errorMessage`.
- `markIgnored(id, reason, tx?)` — sets `processingStatus = 'ignored'`, `errorMessage = reason`.

#### `PaymentTransactionRepository` (`packages/infrastructure/repositories/payments/PaymentTransactionRepository.ts`)

Extended interface and implementation with:
- `findByProviderReferenceGlobal(provider, providerReference, tx?)` — finds a transaction across ALL tenants. Used exclusively by webhook handlers to resolve `tenantId` from an inbound event. Tenant isolation is subsequently enforced by passing the resolved `tenantId` to all write operations.

#### `ParsedProviderWebhook` (`packages/domain/payments/provider.ts`)

Extended with Phase 3 fields (all backward-compatible additions):
- `provider: string` — echo of provider code for traceability.
- `transactionStatus: WebhookTransactionStatus` — canonical `'succeeded' | 'failed' | 'pending' | 'ignored'`.
- `failureReason?: string | null` — optional failure reason from provider payload.
- `metadata?: Record<string, unknown> | null` — optional provider-specific extra fields.
- Legacy `isPaymentSuccess` / `isPaymentFailure` fields kept as derived values.

New type: `WebhookTransactionStatus = 'succeeded' | 'failed' | 'pending' | 'ignored'`.

---

### HTTP Layer

#### New Route: `POST /api/payment-engine/webhooks/:provider`

Registered in `apps/api/src/http/routes/payment-engine.ts` **before** `router.use(requireTenantContext)` and `router.use(requirePaymentOperator)`.

Security:
- **fake_gateway** in `NODE_ENV === 'production'` → **404** (same guard as `/fake-gateway/confirm`).
- All other cases → HMAC signature verification inside `HandlePaymentProviderWebhook` (no session or service token required).
- Future real providers do not have the production 404 guard.

Response mapping:
| Outcome | HTTP Status |
|---|---|
| `processed` | 200 |
| `idempotent_replay` | 200 |
| `ignored` | 200 |
| `invalid_signature` | 401 |
| `unknown_provider` | 404 |
| `parse_error` | 400 |

Controller: `PaymentEngineController.handleProviderWebhook()` — reads raw body from `req.rawBody` (Buffer, set by express.json verify callback) or falls back to `JSON.stringify(req.body)`.

#### Updated Route: `POST /api/payment-engine/fake-gateway/confirm`

Unchanged in behavior. Kept behind `requireTenantContext` (webhook route is the only one that bypasses it).

---

### Dependency Injection

`apps/api/src/container.ts` wires up the three new Phase 3 dependencies:

```
applyGatewayTransactionStatus = new ApplyGatewayTransactionStatus(
  intentRepo, txRepo, allocationRepo, recalculate
)

confirmFakeGatewayPayment = new ConfirmFakeGatewayPayment(
  db, applyGatewayTransactionStatus   ← Phase 3 refactor: 2 args only
)

handlePaymentProviderWebhook = new HandlePaymentProviderWebhook(
  db, providerRegistry, eventRepo, txRepo, applyGatewayTransactionStatus
)
```

---

## Test Coverage

### Phase 3 Tests (`apps/api/src/__tests__/payment-engine-phase3.test.ts`) — 31 tests

| Suite | Tests |
|---|---|
| `FakeGatewayProvider — verifyWebhook` | valid sig, invalid sig, no sig, production guard, custom env secret |
| `FakeGatewayProvider — computeSignature` | consistent output, different payloads, different secrets |
| `FakeGatewayProvider — parseWebhook` | payment.succeeded, payment.failed, payment.pending, unknown type, metadata, invalid JSON, missing event_id |
| `ApplyGatewayTransactionStatus` | succeeded path, failed path, not_found, already_terminal (succeeded), already_terminal (failed) |
| `HandlePaymentProviderWebhook` | unknown_provider, invalid_signature, payment.succeeded full flow, payment.failed full flow, idempotent_replay, TRANSACTION_ALREADY_TERMINAL, payment.pending ignored, signatureValid flag |
| `Webhook route — fake_gateway production guard` | 404 in production, next() in non-production, non-fake_gateway not 404'd |

### Phase 2 Regression Tests — 45 tests (all pass)

One test description updated:
- `parseWebhook() throws unsupported error` → `parseWebhook() is now implemented (Phase 3) and throws on missing required fields`

The assertion now checks for `/event_id/` in the error message (the new validation error) instead of `/Phase 3/` (the old stub message).

---

## Idempotency & Concurrency Guarantees

| Scenario | Mechanism |
|---|---|
| Provider retries same event | `(provider, providerEventId)` unique index → `idempotent_replay` |
| Two concurrent webhooks for same event | First succeeds INSERT; second hits unique constraint → re-check → `idempotent_replay` |
| Two concurrent confirmations for same tx | `SELECT ... FOR UPDATE` on `payment_transactions` row; second sees terminal status → `already_terminal` |
| Duplicate allocation | Unique index `payment_allocations_tx_target_unique` on `(payment_transaction_id, target_type, target_id)` |

---

## Files Changed

| File | Change |
|---|---|
| `packages/domain/payments/provider.ts` | Extended `ParsedProviderWebhook` + new `WebhookTransactionStatus` type |
| `packages/infrastructure/payments/providers/FakeGatewayProvider.ts` | Implemented `verifyWebhook`, `parseWebhook`, `static computeSignature` |
| `packages/infrastructure/repositories/payments/PaymentProviderEventRepository.ts` | Added `tx?` params + `markProcessed`, `markFailed`, `markIgnored` |
| `packages/infrastructure/repositories/payments/PaymentTransactionRepository.ts` | Added `findByProviderReferenceGlobal` to interface + implementation |
| `packages/application/payments/ApplyGatewayTransactionStatus.ts` | **New** — shared atomic transaction-mutation helper |
| `packages/application/payments/HandlePaymentProviderWebhook.ts` | **New** — generic webhook processing use case |
| `packages/application/payments/ConfirmFakeGatewayPayment.ts` | Refactored to delegate to `ApplyGatewayTransactionStatus` |
| `packages/application/payments/index.ts` | Exported new Phase 3 classes and types |
| `apps/api/src/http/controllers/PaymentEngineController.ts` | Added `handleProviderWebhook` handler |
| `apps/api/src/http/routes/payment-engine.ts` | Added `/webhooks/:provider` route before `requireTenantContext` |
| `apps/api/src/container.ts` | Wired `ApplyGatewayTransactionStatus`, refactored `ConfirmFakeGatewayPayment`, added `HandlePaymentProviderWebhook` |
| `apps/api/src/__tests__/payment-engine-phase2.test.ts` | Updated `makeConfirmUseCase` factory (H4/H5), added `findByProviderReferenceGlobal` to fake txRepo, updated `parseWebhook` test description |
| `apps/api/src/__tests__/payment-engine-phase3.test.ts` | **New** — 31 Phase 3 tests |

---

## Phase 4 Scope (Not in Phase 3)

- Void/cancel support for gateway transactions.
- Refund support (outgoing transactions + intent recalculation).
- `ManualProvider` cancel/refund.
- Production deployment of real gateway providers (Midtrans, Xendit, etc.).
