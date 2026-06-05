# Phase 8A — Hybrid Standalone Extraction Report

**Date:** 2026-06-05  
**Status:** ✅ COMPLETE  
**Embedded AuraPoS Engine:** ✅ UNCHANGED — all routes operational

---

## Objective

Extract the AuraPoS payment engine into a reusable standalone architecture without
breaking the embedded engine. Phase 8A delivers the scaffold: contracts, skeleton
service, and typed HTTP client — no DB migrations, no existing route changes.

---

## Deliverables

### 1. `packages/payment-engine-core` — Framework-Agnostic Contracts

**New package. Zero dependency on AuraPoS domain packages.**

| File | Purpose |
|------|---------|
| `src/domain/PaymentScope.ts` | `merchantId`-centric scoping (replaces `tenantId`); `createAuraPosPaymentScope()` migration adapter |
| `src/domain/PaymentMerchant.ts` | `PaymentMerchant` and `ExternalPayableRef` interfaces |
| `src/domain/PaymentProviderAccount.ts` | Provider account contract (environment, status, credentialsRef) |
| `src/domain/PaymentIntent.ts` | `StandalonePaymentIntentDTO`, `CreateStandalonePaymentIntentInput`, `StandaloneIntentStatus` |
| `src/domain/PaymentTransaction.ts` | `StandalonePaymentTransactionDTO`, `StandaloneTransactionStatus` |
| `src/domain/PaymentErrors.ts` | `PaymentEngineError`, `PaymentEngineErrorCode` (14 codes) |
| `src/application/contracts.ts` | Use-case I/O contracts: create intent, gateway payment, status, refundability |
| `src/application/ports.ts` | Port interfaces: merchant repo, intent repo, transaction repo, provider account repo |
| `src/providers/providerActions.ts` | `PaymentProviderAction`, `PaymentProviderActionType`, `PaymentProviderActionDescriptor` |
| `src/providers/providerCapabilities.ts` | `PaymentProviderCapabilities` |
| `src/index.ts` | Public API surface (re-exports all above) |

**tsconfig:** extends `../../tsconfig.base.json` (bundler, strict)  
**Type-check:** `npx tsc -p packages/payment-engine-core/tsconfig.json --noEmit`

---

### 2. `apps/payment-engine-service` — Standalone Express Skeleton

**New app. Port 5100. No dependency on AuraPoS middleware or POS order domain.**

| File | Purpose |
|------|---------|
| `src/config/env.ts` | `loadEnv()` — reads `PAYMENT_ENGINE_SERVICE_PORT`/`PORT`, `NODE_ENV`, `PAYMENT_ENGINE_SERVICE_TOKEN` |
| `src/routes/health.ts` | `GET /health` → `{ ok: true }` · `GET /version` → metadata |
| `src/routes/intents.ts` | `POST /v1/payment-intents`, `GET /v1/payment-intents/:id/status`, `POST /v1/payment-intents/:id/gateway-payments` — all 501 |
| `src/routes/webhooks.ts` | `POST /v1/webhooks/:provider` — 501 |
| `src/container.ts` | Phase 8A DI container (config only; repos wired in 8C) |
| `src/app.ts` | Express app factory (JSON middleware, route mounting, 404 handler) |
| `src/index.ts` | Entry point; listens on configured port; logs endpoint list |

**tsconfig:** `moduleResolution: NodeNext`, `baseUrl: ../..`, paths for `@pos/payment-engine-core`  
**Type-check:** `npx tsc -p apps/payment-engine-service/tsconfig.json --noEmit`

---

### 3. `packages/payment-engine-client-sdk` — Typed HTTP Client

**New package. Self-contained — no `@pos/payment-engine-core` dependency.**

| File | Purpose |
|------|---------|
| `src/types.ts` | Request/response shapes (mirror service API contracts) |
| `src/errors.ts` | `PaymentEngineClientError` (HTTP errors) · `PaymentEngineNetworkError` (transport failures) |
| `src/client.ts` | `PaymentEngineClient` class — fetch-compatible; header injection; JSON error unwrapping |
| `src/index.ts` | Public API surface |

**Implemented methods:**
- `createPaymentIntent(input)` → `POST /v1/payment-intents`
- `createGatewayPayment(intentId, input)` → `POST /v1/payment-intents/:id/gateway-payments`
- `getPaymentIntentStatus(intentId)` → `GET /v1/payment-intents/:id/status`
- `getRefundability(intentId)` → `GET /v1/payment-intents/:id/refundability`

**Injected headers:** `x-payment-engine-service-token`, `x-payment-merchant-id`, `x-source-app`  
**Type-check:** `npx tsc -p packages/payment-engine-client-sdk/tsconfig.json --noEmit`

---

### 4. Root `tsconfig.json` — Project References Updated

Added three new project references:
- `./packages/payment-engine-core/tsconfig.json`
- `./packages/payment-engine-client-sdk/tsconfig.json`
- `./apps/payment-engine-service/tsconfig.json`

---

### 5. Architecture Documentation

`docs/payment-engine-hybrid-standalone-architecture.md` — covers:
- Monorepo layout with new packages
- Identity model change (`tenantId` → `merchantId`)
- Phase 8A → 8E traffic migration table
- API route inventory
- Design principles (no embedded deps, port-based design, backwards compat)
- Running the service

---

## Backwards Compatibility

| Component | Status |
|-----------|--------|
| `apps/api` embedded payment engine | ✅ Unchanged |
| All `/api/payment-engine/...` routes | ✅ Unchanged |
| Existing DB schema | ✅ Unchanged |
| `packages/domain/payments` | ✅ Unchanged |
| `packages/application/payments` | ✅ Unchanged |
| `packages/infrastructure/payments` | ✅ Unchanged |
| All existing tests | ✅ Unchanged |

---

## Identity Model

```
Embedded:   tenantId (AuraPoS slug) → payment intent
Standalone: merchantId              → payment intent
Bridge:     createAuraPosPaymentScope(tenantId) → PaymentScope{ merchantId: tenantId }
```

The bridge lives in `packages/payment-engine-core/src/domain/PaymentScope.ts`.
It is annotated with a `⚠️ MIGRATION NOTE` and scheduled for removal in Phase 8F.

---

## Phase 8A Error Code Inventory

| Code | HTTP | Meaning |
|------|------|---------|
| `INTENT_NOT_FOUND` | 404 | No intent with given ID for merchant |
| `INTENT_NOT_PAYABLE` | 422 | Intent in terminal state |
| `INTENT_EXPIRED` | 422 | Intent past expiry |
| `AMOUNT_EXCEEDS_REMAINING` | 422 | Amount > amountRemaining |
| `INVALID_AMOUNT` | 422 | Amount ≤ 0 |
| `UNSUPPORTED_PROVIDER` | 422 | Provider not available for merchant |
| `PROVIDER_ERROR` | 502 | External provider HTTP/API failure |
| `PROVIDER_NOT_CONFIGURED` | 422 | No active provider account found |
| `TRANSACTION_NOT_FOUND` | 404 | No transaction with given ID |
| `TRANSACTION_NOT_REVERSIBLE` | 422 | Transaction not in refundable/voidable state |
| `DUPLICATE_IDEMPOTENCY_KEY` | 409 | Idempotency key already used |
| `MERCHANT_NOT_FOUND` | 404 | No merchant with given ID |
| `UNAUTHORIZED` | 401 | Invalid or missing service token |
| `INTERNAL_ERROR` | 500 | Unhandled internal error |

---

## Known Gaps (Addressed in Later Phases)

| Gap | Target Phase |
|-----|-------------|
| No DB schema for standalone tables | Phase 8C |
| No real use-case implementations | Phase 8D |
| No webhook signature verification | Phase 8D |
| No authentication middleware | Phase 8D |
| Provider registry not wired | Phase 8B |
| `PAYMENT_ENGINE_SERVICE_TOKEN` not validated (env only) | Phase 8D |

---

## Files Created

```
packages/payment-engine-core/package.json
packages/payment-engine-core/tsconfig.json
packages/payment-engine-core/src/index.ts
packages/payment-engine-core/src/domain/PaymentErrors.ts
packages/payment-engine-core/src/domain/PaymentScope.ts
packages/payment-engine-core/src/domain/PaymentMerchant.ts
packages/payment-engine-core/src/domain/PaymentProviderAccount.ts
packages/payment-engine-core/src/domain/PaymentIntent.ts
packages/payment-engine-core/src/domain/PaymentTransaction.ts
packages/payment-engine-core/src/application/contracts.ts
packages/payment-engine-core/src/application/ports.ts
packages/payment-engine-core/src/application/domain.ts    (internal)
packages/payment-engine-core/src/providers/providerActions.ts
packages/payment-engine-core/src/providers/providerCapabilities.ts

apps/payment-engine-service/package.json
apps/payment-engine-service/tsconfig.json
apps/payment-engine-service/src/config/env.ts
apps/payment-engine-service/src/routes/health.ts
apps/payment-engine-service/src/routes/intents.ts
apps/payment-engine-service/src/routes/webhooks.ts
apps/payment-engine-service/src/container.ts
apps/payment-engine-service/src/app.ts
apps/payment-engine-service/src/index.ts

packages/payment-engine-client-sdk/package.json
packages/payment-engine-client-sdk/tsconfig.json
packages/payment-engine-client-sdk/src/index.ts
packages/payment-engine-client-sdk/src/client.ts
packages/payment-engine-client-sdk/src/types.ts
packages/payment-engine-client-sdk/src/errors.ts

docs/payment-engine-hybrid-standalone-architecture.md
docs/reports/payment-engine-phase-8a-hybrid-standalone-extraction-report.md
tsconfig.json (updated — 3 new project references)
```

---

## Phase 8B Preview

- Migrate provider action/capability types from `@pos/domain/payments/provider.ts` to `@pos/payment-engine-core`
- Adapt embedded providers to expose `PaymentProviderCapabilities` via the core contracts
- Add `@pos/payment-engine-core` path alias to `tsconfig.base.json` for cross-package use
- Begin wiring `apps/api` to import core contracts instead of local types
