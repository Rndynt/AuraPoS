# Payment Engine — Hybrid Standalone Architecture

**Phase:** 8A — Hybrid Standalone Extraction Scaffold  
**Status:** Architecture contracted. Service skeleton. Embedded engine unchanged.  
**Date:** 2026-06-05

---

## Overview

The AuraPoS payment engine began as an embedded subsystem inside `apps/api`.
Phases 1–7 progressively hardened it (multi-provider, partial payments, refunds,
voiding, Phase 7A resilience hardening).

Phase 8A introduces the **Hybrid Standalone** extraction pattern: a new standalone
service is scaffolded alongside the embedded engine. The embedded engine remains
fully operational. A smooth migration across Phases 8B–8E gradually shifts traffic
to the standalone service.

---

## Monorepo Layout

```
packages/
  payment-engine-core/       ← Framework-agnostic contracts (NEW, Phase 8A)
    src/
      domain/                ← Domain types (merchantId-centric)
        PaymentScope.ts
        PaymentMerchant.ts
        PaymentProviderAccount.ts
        PaymentIntent.ts
        PaymentTransaction.ts
        PaymentErrors.ts
      application/           ← Use-case input/output contracts + port interfaces
        contracts.ts
        ports.ts
      providers/             ← Provider action + capability contracts
        providerActions.ts
        providerCapabilities.ts
      index.ts               ← Public API surface

  payment-engine-client-sdk/ ← Typed HTTP client (NEW, Phase 8A)
    src/
      client.ts              ← PaymentEngineClient (fetch-compatible)
      types.ts               ← Request/response shapes (self-contained)
      errors.ts              ← PaymentEngineClientError, PaymentEngineNetworkError
      index.ts               ← Public API surface

apps/
  payment-engine-service/    ← Standalone Express service (NEW, Phase 8A skeleton)
    src/
      config/env.ts          ← Environment variable loader
      routes/health.ts       ← GET /health, GET /version
      routes/intents.ts      ← POST /v1/payment-intents (501 placeholder)
      routes/webhooks.ts     ← POST /v1/webhooks/:provider (501 placeholder)
      container.ts           ← DI container (Phase 8A: config only)
      app.ts                 ← Express application factory
      index.ts               ← Entry point (port 5100)

  api/                       ← Existing AuraPoS API (UNCHANGED, port 5000)
    src/payments/            ← Embedded payment engine (UNCHANGED through Phase 8E)
```

---

## Identity Model Change

### Embedded (current)
```
tenantId → payment intent → transactions
```

The embedded engine uses `tenantId` (AuraPoS-specific slug) as the primary
payment owner identity. This couples the payment engine to AuraPoS's multi-tenant
auth model.

### Standalone (target)
```
merchantId → payment intent → transactions
```

The standalone engine uses `merchantId` as the primary payment owner. A merchant
maps to a commercial entity — decoupled from any source application's auth model.

### Migration Bridge
`PaymentScope.createAuraPosPaymentScope()` in `payment-engine-core` provides
a temporary compatibility adapter that maps AuraPoS `tenantId` → standalone
`merchantId`. This bridge is used during Phases 8B–8E and removed in Phase 8F.

---

## Service Boundaries (Phase 8A → 8E)

| Phase | Embedded Engine | Standalone Service | Client SDK       |
|-------|----------------|--------------------|------------------|
| 8A    | 100% traffic   | 0% (skeleton only) | Types + client   |
| 8B    | 100% traffic   | Provider migration | Internal testing |
| 8C    | 95% traffic    | 5% shadow traffic  | Validation       |
| 8D    | 50% traffic    | 50% traffic        | AuraPoS + others |
| 8E    | 0% (deprecated)| 100% traffic       | All consumers    |

---

## API Routes (Phase 8A)

### Operational
```
GET  /health                                           → 200 { ok: true }
GET  /version                                          → 200 { service, version, phase }
```

### Placeholder (501 Not Implemented — Phase 8D target)
```
POST /v1/payment-intents                               → 501
GET  /v1/payment-intents/:id/status                   → 501
POST /v1/payment-intents/:id/gateway-payments         → 501
POST /v1/webhooks/:provider                           → 501
```

### Future Routes (Phase 8D+)
```
POST /v1/payment-intents/:id/refund                   → Phase 8D
GET  /v1/payment-intents/:id/refundability            → Phase 8D
POST /v1/payment-intents/:id/void                     → Phase 8D
```

---

## Design Principles

### No Embedded Dependencies
`packages/payment-engine-core` and `apps/payment-engine-service` MUST NOT import:
- `@pos/domain` (AuraPoS order domain)
- `@pos/application` (AuraPoS use cases)
- `@pos/infrastructure` (AuraPoS DB repositories)
- AuraPoS session middleware or tenant resolution

These packages are independently versioned and standalone by design.

### Client SDK Self-Containment
`packages/payment-engine-client-sdk` MUST NOT import from `@pos/payment-engine-core`.
It is independently versioned for portability (can be published to npm separately,
used by non-AuraPoS apps without bringing in the core package).

### Port-Based Design
Infrastructure concerns (DB, secrets, external HTTP) are behind port interfaces
(`IPaymentMerchantRepository`, `IStandalonePaymentIntentRepository`, etc.).
Use cases depend only on these interfaces — never on concrete implementations.

### Backwards Compatibility
The embedded AuraPoS payment engine at `apps/api/src/payments/` is **unchanged**.
All existing `/api/payment-engine/...` routes continue to work normally.
No DB migrations are required in Phase 8A.

---

## Port (Default 5100)

The standalone service runs on port `5100` by default.  
Set `PAYMENT_ENGINE_SERVICE_PORT` or `PORT` env var to override.  
Port `5000` is reserved for `apps/api`.

---

## Running the Standalone Service (Phase 8A)

```bash
# From monorepo root
PAYMENT_ENGINE_SERVICE_PORT=5100 \
  npx tsx --tsconfig apps/payment-engine-service/tsconfig.json \
  apps/payment-engine-service/src/index.ts

# Or via workspace script
pnpm --filter @pos/payment-engine-service dev
```

Expected output:
```
[payment-engine-service] Phase 8A listening on port 5100 (NODE_ENV=development)
  GET http://localhost:5100/health
  GET http://localhost:5100/version

  Placeholder routes (501 Not Implemented):
  POST http://localhost:5100/v1/payment-intents
  GET  http://localhost:5100/v1/payment-intents/:id/status
  POST http://localhost:5100/v1/webhooks/:provider
```

---

## Type-Check Commands

```bash
# payment-engine-core
npx tsc -p packages/payment-engine-core/tsconfig.json --noEmit

# payment-engine-client-sdk
npx tsc -p packages/payment-engine-client-sdk/tsconfig.json --noEmit

# payment-engine-service
npx tsc -p apps/payment-engine-service/tsconfig.json --noEmit
```

---

## Next Phases

| Phase | Description |
|-------|-------------|
| 8B    | Provider migration: embedded providers adapt to core contracts |
| 8C    | DB schema addendum: standalone tables (merchant, standalone_intent, etc.) |
| 8D    | Full use-case wiring in payment-engine-service |
| 8E    | AuraPoS consumes client SDK; embedded engine deprecated |
| 8F    | Remove migration bridge; standalone-only |
