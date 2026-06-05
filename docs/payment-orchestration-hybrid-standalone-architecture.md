# Payment Orchestration — Hybrid Standalone Architecture

**Phase:** 8A — Hybrid Standalone Extraction Scaffold (Hardened)
**Status:** Architecture contracted. Service skeleton. Embedded engine unchanged.
**Date:** 2026-06-05
**Naming:** `@northflow/payment-orchestration-*`

---

## Overview

The AuraPoS payment engine began as an embedded subsystem inside `apps/api`.
Phases 1–7 progressively hardened it (multi-provider, partial payments, refunds,
voiding, Phase 7A resilience hardening).

Phase 8A introduces the **Hybrid Standalone** extraction pattern: a new standalone
service is scaffolded alongside the embedded engine under the `@northflow` namespace.
The embedded engine remains fully operational. A smooth migration across Phases 8B–8E
gradually shifts traffic to the standalone service.

The standalone system is intentionally branded `@northflow/payment-orchestration-*`
rather than `@pos/payment-engine-*` because it is designed to be reusable by
AuraPoS, Transity, KiosKoin, photography apps, and future projects — not tied to any
single product.

---

## Monorepo Layout

```
packages/
  payment-orchestration-core/        ← Framework-agnostic contracts (NEW, Phase 8A)
    src/
      domain/                        ← Domain types (merchantId-centric)
        PaymentScope.ts
        PaymentMerchant.ts
        PaymentProviderAccount.ts
        PaymentIntent.ts
        PaymentTransaction.ts
        PaymentErrors.ts
      application/                   ← Use-case input/output contracts + port interfaces
        contracts.ts
        ports.ts
      providers/                     ← Provider action + capability contracts
        providerActions.ts
        providerCapabilities.ts
      index.ts                       ← Public API surface

  payment-orchestration-client-sdk/  ← Typed HTTP client (NEW, Phase 8A)
    src/
      client.ts                      ← PaymentEngineClient (fetch-compatible)
      types.ts                       ← Request/response shapes (self-contained)
      errors.ts                      ← PaymentEngineClientError, PaymentEngineNetworkError
      index.ts                       ← Public API surface

apps/
  payment-orchestration-service/     ← Standalone Express service (NEW, Phase 8A skeleton)
    src/
      config/env.ts                  ← Environment variable loader (dual-env-var support)
      routes/health.ts               ← GET /health, GET /version
      routes/intents.ts              ← POST /v1/payment-intents (501 placeholder)
                                        GET  /v1/payment-intents/:id/status (501)
                                        GET  /v1/payment-intents/:id/refundability (501)
                                        POST /v1/payment-intents/:id/gateway-payments (501)
      routes/webhooks.ts             ← POST /v1/webhooks/:provider (501 placeholder)
      container.ts                   ← DI container (Phase 8A: config only)
      app.ts                         ← Express application factory
      index.ts                       ← Entry point (port 5100)

  api/                               ← Existing AuraPoS API (UNCHANGED, port 5000)
    src/payments/                    ← Embedded payment engine (UNCHANGED through Phase 8E)
```

---

## Package Names

| Package | Name |
|---------|------|
| Core contracts | `@northflow/payment-orchestration-core` |
| Standalone service | `@northflow/payment-orchestration-service` |
| HTTP client SDK | `@northflow/payment-orchestration-client-sdk` |

Do NOT use `@pos/payment-engine-*` for the standalone packages — those names are
legacy and have been replaced in Phase 8A hardening.

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
`createAuraPosPaymentScope()` in `payment-orchestration-core` provides
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
GET  /health                                           → 200 { ok: true, service: 'payment-orchestration-service' }
GET  /version                                          → 200 { service, version, phase }
```

### Placeholder (501 Not Implemented — Phase 8D target)
```
POST /v1/payment-intents                               → 501
GET  /v1/payment-intents/:id/status                   → 501
GET  /v1/payment-intents/:id/refundability            → 501  ← added in Phase 8A hardening
POST /v1/payment-intents/:id/gateway-payments         → 501
POST /v1/webhooks/:provider                           → 501
```

### Future Routes (Phase 8D+)
```
POST /v1/payment-intents/:id/refund                   → Phase 8D
POST /v1/payment-intents/:id/void                     → Phase 8D
```

---

## Environment Variables

### Port
| Variable | Description |
|----------|-------------|
| `PAYMENT_ORCHESTRATION_SERVICE_PORT` | Preferred. Port for the standalone service. |
| `PAYMENT_ENGINE_SERVICE_PORT` | Backwards-compat alias. |
| `PORT` | Generic fallback. |
| *(default)* | `5100` |

### Service Token
| Variable | Description |
|----------|-------------|
| `PAYMENT_ORCHESTRATION_SERVICE_TOKEN` | Preferred. Auth token for service-to-service calls. |
| `PAYMENT_ENGINE_SERVICE_TOKEN` | Backwards-compat alias during monorepo transition. |

---

## Design Principles

### No Embedded Dependencies
`packages/payment-orchestration-core` and `apps/payment-orchestration-service` MUST NOT import:
- `@pos/domain` (AuraPoS order domain)
- `@pos/application` (AuraPoS use cases)
- `@pos/infrastructure` (AuraPoS DB repositories)
- AuraPoS session middleware or tenant resolution

These packages are independently versioned and standalone by design.

### Client SDK Self-Containment
`packages/payment-orchestration-client-sdk` MUST NOT import from
`@northflow/payment-orchestration-core`. It is independently versioned for portability
(can be published to npm separately, used by non-AuraPoS apps without bringing in the core package).

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
Set `PAYMENT_ORCHESTRATION_SERVICE_PORT` (or legacy `PAYMENT_ENGINE_SERVICE_PORT`) to override.
Port `5000` is reserved for `apps/api`.

---

## Running the Standalone Service (Phase 8A)

```bash
# From monorepo root
PAYMENT_ORCHESTRATION_SERVICE_PORT=5100 \
  npx tsx --tsconfig apps/payment-orchestration-service/tsconfig.json \
  apps/payment-orchestration-service/src/index.ts

# Or via workspace script
pnpm --filter @northflow/payment-orchestration-service dev
```

Expected output:
```
[payment-orchestration-service] Phase 8A listening on port 5100 (NODE_ENV=development)
  GET http://localhost:5100/health
  GET http://localhost:5100/version

  Placeholder routes (501 Not Implemented):
  POST http://localhost:5100/v1/payment-intents
  GET  http://localhost:5100/v1/payment-intents/:id/status
  GET  http://localhost:5100/v1/payment-intents/:id/refundability
  POST http://localhost:5100/v1/webhooks/:provider
```

---

## Type-Check Commands

```bash
# payment-orchestration-core
pnpm --filter @northflow/payment-orchestration-core type-check

# payment-orchestration-client-sdk
pnpm --filter @northflow/payment-orchestration-client-sdk type-check

# payment-orchestration-service
pnpm --filter @northflow/payment-orchestration-service type-check
```

---

## Next Phases

| Phase | Description |
|-------|-------------|
| 8B    | Provider migration: embedded providers adapt to core contracts |
| 8C    | DB schema addendum: standalone tables (merchant, standalone_intent, etc.) |
| 8D    | Full use-case wiring in payment-orchestration-service |
| 8E    | AuraPoS consumes client SDK; embedded engine deprecated |
| 8F    | Remove migration bridge (`createAuraPosPaymentScope`); standalone-only |
