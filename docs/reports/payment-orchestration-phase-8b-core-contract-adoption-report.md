# Payment Orchestration — Phase 8B Core Contract Adoption Report

**Date:** 2026-06-05
**Phase:** 8B — Core Contract Adoption / Provider Contract Migration
**Status:** ✅ COMPLETE
**Base commit:** `cbfd7b3c4d0671a9d9d8553589aef05c79bd78fa` (Phase 8A Hardening)

---

## Summary

Phase 8B makes `@northflow/payment-orchestration-core` the canonical provider action and capability
contract shape. It renames the SDK public class to `PaymentOrchestrationClient`, creates adapter
helpers between embedded and core provider types, and adds 14 contract compatibility tests. No
runtime behavior was changed and no DB schema was added.

---

## Files Changed

### New files

| File | Purpose |
|------|---------|
| `packages/application/payments/adapters/PaymentProviderCoreAdapter.ts` | Adapter mapping embedded → core provider types |
| `apps/api/src/__tests__/payment-orchestration-core-contract-adapter.test.ts` | 14 contract compatibility tests |
| `docs/reports/payment-orchestration-phase-8b-core-contract-adoption-report.md` | This report |

### Modified files

| File | Change |
|------|--------|
| `packages/payment-orchestration-client-sdk/src/errors.ts` | Renamed classes to `PaymentOrchestration*`; added deprecated aliases |
| `packages/payment-orchestration-client-sdk/src/types.ts` | Renamed `PaymentEngineClientConfig` → `PaymentOrchestrationClientConfig`; deprecated alias kept |
| `packages/payment-orchestration-client-sdk/src/client.ts` | Renamed class to `PaymentOrchestrationClient`; updated all internal error refs |
| `packages/payment-orchestration-client-sdk/src/index.ts` | Updated primary exports; added deprecated aliases; updated JSDoc usage example |
| `packages/payment-orchestration-core/src/providers/providerCapabilities.ts` | Added 3 optional fields: `supportsMultiplePartialRefund?`, `canReturnImmediateSuccess?`, `canReturnImmediateFailure?` |
| `tsconfig.base.json` | Added `@northflow/payment-orchestration-core` path alias |
| `apps/api/tsconfig.json` | Added `@northflow/payment-orchestration-core` path alias (overrides base) |
| `apps/api/tsconfig.node.json` | Added `@northflow/payment-orchestration-core` path alias (test runner) |
| `docs/payment-orchestration-hybrid-standalone-architecture.md` | Added Phase 8B section |

---

## Task 1 — SDK Rename Summary

### Primary names (Phase 8B)

| Before | After |
|--------|-------|
| `PaymentEngineClient` | `PaymentOrchestrationClient` |
| `PaymentEngineClientError` | `PaymentOrchestrationClientError` |
| `PaymentEngineNetworkError` | `PaymentOrchestrationNetworkError` |
| `PaymentEngineClientConfig` | `PaymentOrchestrationClientConfig` |

### Deprecated aliases (kept for backward compatibility)

```ts
export { PaymentOrchestrationClient as PaymentEngineClient };
export { PaymentOrchestrationClientError as PaymentEngineClientError };
export { PaymentOrchestrationNetworkError as PaymentEngineNetworkError };
export type { PaymentOrchestrationClientConfig as PaymentEngineClientConfig };
```

All deprecated aliases are marked `@deprecated` in JSDoc. They will be removed in a
future major version.

---

## Task 2/3 — Core Provider Contract Adoption

### Comparison: embedded vs. core types

**Action types** — identical union literals, just different type aliases:

| Embedded `ProviderActionType` | Core `PaymentProviderActionType` | Match |
|-------------------------------|----------------------------------|-------|
| `redirect_customer` | `redirect_customer` | ✅ |
| `present_qr` | `present_qr` | ✅ |
| `display_code` | `display_code` | ✅ |
| `poll` | `poll` | ✅ |
| `none` | `none` | ✅ |

**Descriptor types** — identical:

| Embedded `ProviderActionDescriptor` | Core `PaymentProviderActionDescriptor` | Match |
|-------------------------------------|----------------------------------------|-------|
| `WEB_URL` | `WEB_URL` | ✅ |
| `QR_STRING` | `QR_STRING` | ✅ |
| `VA_NUMBER` | `VA_NUMBER` | ✅ |
| `PAYMENT_CODE` | `PAYMENT_CODE` | ✅ |
| `NONE` | `NONE` | ✅ |

**Action shape differences** (handled by adapter):

| Embedded `ProviderAction` | Core `PaymentProviderAction` | Adapter decision |
|---------------------------|------------------------------|-----------------|
| `value?: string \| null` | `value: string \| null` | `embedded.value ?? null` |
| — (no `url` field) | `url: string \| null` | set to `value` for WEB_URL, else `null` |
| `expiresAt?: Date \| null` | *(not in core)* | intentionally dropped (portable DTO) |
| `metadata?: Record<...>` | *(not in core)* | intentionally dropped (portable DTO) |

**Capability shape differences** (handled by adapter):

| Embedded field | Core field | Adapter |
|----------------|-----------|---------|
| `canCancel` | `supportsCancel` | rename |
| `canRefund` | `supportsRefund` | rename |
| `supportsWebhook` | `supportsWebhook` | direct |
| `supportsPolling` | `supportsPolling` | direct |
| `supportsRedirect` | `supportsRedirect` | direct |
| `supportsQr` | `supportsQr` | direct |
| `supportsVa` | `supportsVa` | direct |
| `supportsPaymentCode` | `supportsPaymentCode` | direct |
| `supportsPartialRefund` | `supportsPartialRefund` | direct |
| `supportsMultiplePartialRefund` | `supportsMultiplePartialRefund?` | direct (Phase 8B optional) |
| `canReturnImmediateSuccess` | `canReturnImmediateSuccess?` | direct (Phase 8B optional) |
| `canReturnImmediateFailure` | `canReturnImmediateFailure?` | direct (Phase 8B optional) |
| `supportedScenarios?: string[]` | *(not in core)* | intentionally dropped (dev/test only) |
| *(no equivalent)* | `supportedMethods: string[]` | always `[]` (embedded has no direct equivalent) |

### Adapter file

```text
packages/application/payments/adapters/PaymentProviderCoreAdapter.ts
```

```ts
toCoreProviderAction(embedded: ProviderAction): PaymentProviderAction
toCoreProviderActions(embedded: ProviderAction[]): PaymentProviderAction[]
toCoreProviderCapabilities(embedded: ProviderCapabilities): PaymentProviderCapabilities
```

Pure functions — no side effects, no DB calls, no provider API calls.

---

## Task 4 — Tests Added

**File:** `apps/api/src/__tests__/payment-orchestration-core-contract-adapter.test.ts`

| # | Test | Suite | Result |
|---|------|-------|--------|
| 1 | FakeGateway qris → `present_qr` + `QR_STRING` | FakeGateway action mapping | ✅ PASS |
| 2 | FakeGateway va → `display_code` + `VA_NUMBER` | FakeGateway action mapping | ✅ PASS |
| 3 | FakeGateway redirect → `redirect_customer` + `WEB_URL` | FakeGateway action mapping | ✅ PASS |
| 3b | FakeGateway payment_code → `display_code` + `PAYMENT_CODE` | FakeGateway action mapping | ✅ PASS |
| 3c | FakeGateway immediate_success → empty actions | FakeGateway action mapping | ✅ PASS |
| 3d | FakeGateway immediate_failure → empty actions | FakeGateway action mapping | ✅ PASS |
| 4 | Xendit redirect (mocked) → `redirect_customer` + `WEB_URL` | Xendit action mapping | ✅ PASS |
| 5 | Xendit QR (mocked) → `present_qr` + `QR_STRING` | Xendit action mapping | ✅ PASS |
| 6 | Xendit VA (mocked) → `display_code` + `VA_NUMBER` | Xendit action mapping | ✅ PASS |
| 7 | FakeGateway capability mapping preserves all booleans | Capability mapping | ✅ PASS |
| 8 | Xendit sandbox capability mapping preserves all booleans | Capability mapping | ✅ PASS |
| 9 | Manual provider capability mapping (no gateway capabilities) | Capability mapping | ✅ PASS |
| 10 | null value action → `value=null, url=null` | Edge cases | ✅ PASS |
| 10b | `expiresAt`/`metadata` not propagated to core | Edge cases | ✅ PASS |

**Total: 14/14 PASS**

---

## Commands Run

| Command | Result |
|---------|--------|
| `pnpm --filter @northflow/payment-orchestration-core type-check` | ✅ PASS |
| `pnpm --filter @northflow/payment-orchestration-service type-check` | ✅ PASS |
| `pnpm --filter @northflow/payment-orchestration-client-sdk type-check` | ✅ PASS |
| `npm run check` (full monorepo, 13 tasks) | ✅ 13/13 PASS |
| Contract adapter test (14 tests) | ✅ 14/14 PASS |
| Xendit sandbox integration test (11 tests) | ✅ 11/11 PASS |
| FakeGateway E2E test | NOT RUN — FakeGateway E2E requires live DB. Existing 6 FakeGateway action scenarios are covered by contract adapter tests via direct `createPayment()` calls. |

---

## Known Limitations

1. `supportedMethods` in core `PaymentProviderCapabilities` is always `[]` from the adapter.
   Embedded providers have no equivalent field. Phase 9+ may populate this from
   provider-specific channel lists.

2. `expiresAt` and `metadata` in embedded `ProviderAction` are dropped when converting to
   core DTO. Callers that need those fields should retain the original embedded action alongside
   the core representation.

3. Xendit action mapping tests use mocked embedded `ProviderAction` objects (the XenditProvider
   already normalises Xendit raw responses into embedded types; testing the adapter on those
   normalised values is sufficient and avoids live network calls).

4. `PaymentEngineError` and `PaymentEngineErrorCode` in `@northflow/payment-orchestration-core`
   retain their current names. Renaming those is deferred to Phase 8C+ to avoid scope creep.

---

## Confirmations (required by prompt)

| Confirmation | Status |
|-------------|--------|
| No DB schema was added | ✅ Confirmed |
| `apps/payment-orchestration-service` remains skeleton — no real use cases wired | ✅ Confirmed |
| No real provider behavior changed | ✅ Confirmed |
| Xendit sandbox adapter behavior remains intact | ✅ Confirmed (11/11 integration tests pass) |
| FakeGateway behavior remains intact | ✅ Confirmed (action scenarios tested via adapter tests) |
| Provider-level refund/cancel was NOT implemented | ✅ Confirmed |
| POS UI/order adapter was NOT implemented | ✅ Confirmed |
| Legacy order payment flow was NOT intentionally changed | ✅ Confirmed |
| Embedded `/api/payment-engine/...` routes remain the runtime source of truth | ✅ Confirmed |
| Provider codes unchanged (`fake_gateway`, `xendit_sandbox`, `manual`) | ✅ Confirmed |
