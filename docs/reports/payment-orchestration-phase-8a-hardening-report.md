# Payment Orchestration — Phase 8A Hardening Report

**Date:** 2026-06-05
**Phase:** 8A Hardening
**Status:** ✅ COMPLETE
**Based on:** Phase 8A extraction scaffold

---

## Summary

This hardening renames the standalone payment scaffold from `@pos/payment-engine-*`
to `@northflow/payment-orchestration-*`, fixes a route mismatch between the client
SDK and the service, syncs the SDK request types with core contracts, and updates
all related documentation. No real provider behavior was changed.

---

## Folders/Files Renamed

| Before | After |
|--------|-------|
| `packages/payment-engine-core/` | `packages/payment-orchestration-core/` |
| `packages/payment-engine-client-sdk/` | `packages/payment-orchestration-client-sdk/` |
| `apps/payment-engine-service/` | `apps/payment-orchestration-service/` |

---

## Package Names Before / After

| Package | Before | After |
|---------|--------|-------|
| Core contracts | `@pos/payment-engine-core` | `@northflow/payment-orchestration-core` |
| Standalone service | `@pos/payment-engine-service` | `@northflow/payment-orchestration-service` |
| HTTP client SDK | `@pos/payment-engine-client-sdk` | `@northflow/payment-orchestration-client-sdk` |

---

## Root `tsconfig.json` References Updated

| Before | After |
|--------|-------|
| `./packages/payment-engine-core/tsconfig.json` | `./packages/payment-orchestration-core/tsconfig.json` |
| `./packages/payment-engine-client-sdk/tsconfig.json` | `./packages/payment-orchestration-client-sdk/tsconfig.json` |
| `./apps/payment-engine-service/tsconfig.json` | `./apps/payment-orchestration-service/tsconfig.json` |

---

## Additional: HTTP Header Name Updated

The client SDK header `x-payment-engine-service-token` was renamed to
`x-payment-orchestration-service-token` in `packages/payment-orchestration-client-sdk/src/client.ts`
for consistency. The service does not yet validate this header (Phase 8D), so there is no
breaking change. Phase 8D implementors should accept `x-payment-orchestration-service-token`.

---

## Service Identity Strings Updated

All runtime strings updated from `payment-engine-service` to `payment-orchestration-service`:

- `GET /health` → `{ ok: true, service: 'payment-orchestration-service' }`
- `GET /version` → `{ service: 'payment-orchestration-service', ... }`
- Startup log: `[payment-orchestration-service] Phase 8A listening on port 5100`
- Error 404 message references `payment-orchestration-service`
- Error messages in client.ts reference `payment-orchestration-service`

---

## Task 5 — Service/SDK Route Mismatch Fix

**Problem:** SDK `getRefundability(intentId)` called
`GET /v1/payment-intents/:id/refundability`, but the service had no matching route —
returning a 404 (from the 404 catch-all) instead of the intended 501.

**Fix:** Added placeholder route to `apps/payment-orchestration-service/src/routes/intents.ts`:

```
GET /v1/payment-intents/:id/refundability → 501
```

Response:
```json
{
  "ok": false,
  "error": "NOT_IMPLEMENTED",
  "message": "GET /v1/payment-intents/:id/refundability is not yet implemented. Phase 8D.",
  "phase": "8A"
}
```

Route inventory in `docs/payment-orchestration-hybrid-standalone-architecture.md` updated.

---

## Task 6 — SDK Contract Sync Fix

**Problem:** `CreatePaymentIntentRequest` in the client SDK was missing optional external
context fields that exist in core's `CreatePaymentIntentInput`.

**Fix:** Added to `packages/payment-orchestration-client-sdk/src/types.ts`:

```ts
export interface CreatePaymentIntentRequest {
  merchantId?: string;
  sourceApp?: string | null;         // ← added
  externalTenantId?: string | null;  // ← added
  externalOutletId?: string | null;  // ← added
  externalLocationId?: string | null;// ← added
  externalPayableType: string;
  externalPayableId: string;
  currency: string;
  amountDue: number;
  allowPartial?: boolean;
  expiresAt?: string | null;
  metadata?: Record<string, unknown> | null;
  idempotencyKey?: string | null;
}
```

JSDoc updated to explain that `merchantId` and `sourceApp` can be omitted if the
client was constructed with those values (they are injected via headers automatically).

---

## Task 7 — Docs Naming Fixes

- Created `docs/payment-orchestration-hybrid-standalone-architecture.md` with correct
  `@northflow/payment-orchestration-*` naming throughout.
- All references to `PaymentScope.createAuraPosPaymentScope()` corrected to
  `createAuraPosPaymentScope()` (it is a standalone exported function, not a static class method).
- Historical docs in `docs/reports/payment-engine-phase-*.md` preserved as-is.
- Historical Phase 8A extraction report preserved as-is at
  `docs/reports/payment-engine-phase-8a-hybrid-standalone-extraction-report.md`.

---

## Task 8 — Env Var Compatibility

Both environment variable names are supported. Preferred names in new docs:

| Preferred | Legacy Alias |
|-----------|-------------|
| `PAYMENT_ORCHESTRATION_SERVICE_TOKEN` | `PAYMENT_ENGINE_SERVICE_TOKEN` |
| `PAYMENT_ORCHESTRATION_SERVICE_PORT` | `PAYMENT_ENGINE_SERVICE_PORT` |

The service reads preferred name first, falls back to legacy alias for backwards
compatibility during monorepo transition.

---

## Commands Run

### `npm run check` (full monorepo type-check via Turborepo)
```
✅ PASS — 13 tasks successful, 13 total (0 cached)
```

### `pnpm --filter @northflow/payment-orchestration-core type-check`
```
✅ PASS — EXIT_CODE:0
```

### `pnpm --filter @northflow/payment-orchestration-service type-check`
```
✅ PASS — EXIT_CODE:0
```

### `pnpm --filter @northflow/payment-orchestration-client-sdk type-check`
```
✅ PASS — EXIT_CODE:0
```

### Existing Xendit payment test
```
npx tsx --tsconfig apps/api/tsconfig.node.json --test \
  apps/api/src/__tests__/payment-xendit-gateway-integration.test.ts

✅ PASS — 11/11 tests passed (CreateGatewayPayment — Xendit sandbox integration)
```

---

## Known Limitations

1. The service has no real use-case implementations (Phase 8D target).
2. No DB schema for standalone tables (Phase 8C target).
3. No authentication middleware beyond env var presence check (Phase 8D target).
4. Provider registry not wired (Phase 8B target).
5. `createAuraPosPaymentScope()` migration bridge scheduled for removal in Phase 8F.
6. The legacy architecture doc `docs/payment-engine-hybrid-standalone-architecture.md`
   still uses the old naming (`payment-engine-*`) — preserved as historical reference.

---

## Confirmations

| Confirmation | Status |
|--------------|--------|
| No real provider behavior changed | ✅ Confirmed |
| Xendit sandbox adapter (`XenditProvider.ts`) unchanged | ✅ Confirmed |
| FakeGateway adapter unchanged | ✅ Confirmed |
| Provider-level refund/cancel NOT implemented | ✅ Confirmed |
| POS UI not changed | ✅ Confirmed |
| No order adapter implemented | ✅ Confirmed |
| Legacy order payment flow not intentionally changed | ✅ Confirmed |
| `/api/orders/:id/payments` route unchanged | ✅ Confirmed |
| `/api/orders/create-and-pay` route unchanged | ✅ Confirmed |
| `packages/application/orders/RecordPayment.ts` unchanged | ✅ Confirmed |
| `packages/application/orders/CreateAndPayOrder.ts` unchanged | ✅ Confirmed |
| `apps/api/src/http/routes/orders.ts` unchanged | ✅ Confirmed |
| `apps/api/src/http/routes/payment-engine.ts` unchanged | ✅ Confirmed |
| Embedded AuraPoS payment-engine routes operational | ✅ Confirmed |
| Existing DB schema unchanged | ✅ Confirmed |
