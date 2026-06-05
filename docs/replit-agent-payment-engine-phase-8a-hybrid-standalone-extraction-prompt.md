# Replit Agent Prompt — Payment Engine Phase 8A Hybrid Standalone Extraction

Use this prompt in Replit Agent.

You are working in the AuraPoS repository.

This is **Payment Engine Phase 8A: Hybrid Standalone Extraction — Core + Service + Client SDK**.

The user explicitly chose **Model 3: Hybrid package + service**:

```text
payment-engine-core
payment-engine-service
payment-engine-client-sdk
```

Important context:

- AuraPoS is still in development.
- No production users.
- No need to preserve old payment-engine data.
- No need to design around legacy data migration/backward data compatibility.
- Do not over-optimize for existing AuraPoS tenant compatibility.
- The goal is to make the payment engine reusable by other projects later.

Current accepted base:

- `19181075808ac7a50b08209a74e3312bcef13333`

Read first:

- `docs/payment-engine-roadmap.md`
- `docs/reports/payment-engine-phase-7a-xendit-sandbox-report.md`
- `docs/reports/payment-engine-phase-7a-hardening-report.md`
- `docs/payment-engine-xendit-sandbox-smoke.md`
- `docs/payment-engine-fakegateway-e2e-smoke.md`

## Existing workspace context

The root already supports workspaces:

```json
"workspaces": [
  "packages/*",
  "apps/*",
  "shared"
]
```

So the new hybrid structure must fit the existing monorepo.

---

## Guardrails

Do not implement unrelated product features:

- no POS UI changes
- no order adapter yet
- no split bill
- no customer ledger
- no stock reservation
- no PPOB wallet/credit
- no provider-level Xendit refund/cancel
- no Midtrans adapter
- no Stripe adapter
- no production Xendit enablement
- no scheduled cron/worker layer
- no external provider polling endpoint
- no platform-managed settlement/payout

Legacy order payment can remain as-is for now, but do not intentionally modify it:

- `/api/orders/:id/payments`
- `/api/orders/create-and-pay`
- `packages/application/orders/RecordPayment.ts`
- `packages/application/orders/CreateAndPayOrder.ts`
- `apps/api/src/http/routes/orders.ts`
- `order_payments` legacy table behavior

Because this is development-only, schema compatibility with previous payment-engine data is not required. However, do not delete working payment-engine behavior unless the phase explicitly says so.

---

## Main goal

Start extracting the payment engine into a reusable hybrid architecture inside the same monorepo:

```text
packages/payment-engine-core
apps/payment-engine-service
packages/payment-engine-client-sdk
```

Phase 8A should create the boundary, package skeletons, contracts, and migration plan while keeping the existing embedded AuraPoS payment engine operational.

This phase must NOT attempt to move every payment-engine file at once.

The desired outcome is:

1. New packages/apps exist and type-check.
2. Core package exposes standalone payment concepts, especially `merchantId` / `paymentMerchantId` instead of AuraPoS `tenantId` as the long-term primary identity.
3. Service package provides an Express API skeleton for standalone payment service.
4. Client SDK package provides typed client helpers for future AuraPoS/other apps.
5. Existing embedded AuraPoS payment-engine endpoints continue to work.
6. Clear report documents what was scaffolded and what remains embedded.

---

## Architecture target

### 1. `packages/payment-engine-core`

Purpose:

- Framework-agnostic payment engine contracts.
- Domain types.
- Application input/output contracts.
- Provider interfaces.
- Error types.
- Payment scope model.
- No Express.
- No AuraPoS request/session middleware.
- No POS order dependency.
- No direct environment variable reads.
- No hard dependency on `apps/api`.

This package should be reusable by:

- `apps/payment-engine-service`
- future external services
- tests
- possibly existing embedded AuraPoS during gradual migration

Recommended structure:

```text
packages/payment-engine-core/
  package.json
  tsconfig.json
  src/
    index.ts
    domain/
      PaymentScope.ts
      PaymentMerchant.ts
      PaymentProviderAccount.ts
      PaymentProvider.ts
      PaymentIntent.ts
      PaymentTransaction.ts
      PaymentErrors.ts
    application/
      contracts.ts
      ports.ts
    providers/
      providerActions.ts
      providerCapabilities.ts
```

Do not duplicate large existing code blindly. In Phase 8A, it is acceptable to create clean exported contracts and TODO migration comments.

### 2. `apps/payment-engine-service`

Purpose:

- Standalone payment engine HTTP service shell.
- Express TypeScript service is acceptable.
- It imports contracts from `@pos/payment-engine-core` or the local package name used in the repo.
- It must be service-oriented and not depend on POS UI.

Recommended structure:

```text
apps/payment-engine-service/
  package.json
  tsconfig.json
  src/
    index.ts
    app.ts
    routes/
      health.ts
      intents.ts
      webhooks.ts
    config/
      env.ts
    container.ts
```

Phase 8A service can be skeletal but must compile.

Minimum endpoints:

```text
GET /health
GET /version
```

Optional placeholder routes can return `501 Not Implemented` with clear messages:

```text
POST /v1/payment-intents
GET /v1/payment-intents/:id/status
POST /v1/webhooks/:provider
```

Do not wire to real DB/provider in Phase 8A unless it is low-risk and explicitly isolated.

### 3. `packages/payment-engine-client-sdk`

Purpose:

- Typed client SDK for apps like AuraPoS, Transity, Photography app, etc.
- No React dependency.
- No POS dependency.
- Uses fetch-compatible client.
- Exposes typed methods but can be skeletal in Phase 8A.

Recommended structure:

```text
packages/payment-engine-client-sdk/
  package.json
  tsconfig.json
  src/
    index.ts
    client.ts
    types.ts
    errors.ts
```

Minimum client methods:

```ts
createPaymentIntent(input)
createGatewayPayment(intentId, input)
getPaymentIntentStatus(intentId)
getRefundability(intentId)
```

For Phase 8A, methods can be implemented as real HTTP wrappers against a configurable base URL.

---

## Tenant cleanup direction

The long-term standalone model must NOT use AuraPoS `tenantId` as the primary payment identity.

Use this direction:

```text
paymentMerchantId / merchantId = primary commercial/payment owner
sourceApp = app that created the payment, e.g. aurapos/transity/kioskoin
externalTenantId = tenant id from source app, if any
externalOutletId / externalLocationId = source app outlet/location id, if any
externalPayableType = order/invoice/booking/etc
externalPayableId = source app payable id
providerAccountId = merchant's provider account config
```

Phase 8A should introduce these concepts in `payment-engine-core`, even if the existing embedded AuraPoS code still uses `tenantId` internally.

Recommended type:

```ts
export interface PaymentScope {
  merchantId: string;
  sourceApp?: string;
  externalTenantId?: string | null;
  externalOutletId?: string | null;
  externalLocationId?: string | null;
  providerAccountId?: string | null;
  metadata?: Record<string, unknown>;
}
```

For embedded AuraPoS compatibility during migration, create a mapper/helper:

```ts
export function createAuraPosPaymentScope(input: {
  tenantId: string;
  outletId?: string | null;
  providerAccountId?: string | null;
}): PaymentScope
```

Temporary mapping:

```text
merchantId = tenantId
sourceApp = 'aurapos'
externalTenantId = tenantId
externalOutletId = outletId
```

This is temporary and should be documented as embedded compatibility only.

---

## Task 1 — Create `packages/payment-engine-core`

Create a new workspace package.

Recommended package name:

```json
"name": "@pos/payment-engine-core"
```

Required files:

```text
packages/payment-engine-core/package.json
packages/payment-engine-core/tsconfig.json
packages/payment-engine-core/src/index.ts
```

Add framework-agnostic exports for:

- `PaymentScope`
- `createAuraPosPaymentScope`
- `PaymentMerchant`
- `PaymentProviderAccount`
- `PaymentProviderAccountEnvironment`
- `PaymentProviderAccountStatus`
- `PaymentProviderAction`
- `PaymentProviderActionDescriptor`
- `PaymentProviderCapabilities`
- `PaymentEngineError`
- `PaymentEngineErrorCode`
- basic intent/transaction DTO contracts

Important:

- This package should compile without importing from `apps/api`.
- Avoid importing from Express.
- Avoid importing from React.
- Avoid importing from POS order modules.
- Avoid importing from Better Auth/session middleware.
- Keep dependencies minimal.

---

## Task 2 — Create core standalone identity contracts

In `payment-engine-core`, define identity contracts that move away from AuraPoS tenant-centric naming.

Required concepts:

```ts
PaymentMerchant
PaymentProviderAccount
PaymentScope
ExternalPayableRef
```

Suggested models:

```ts
export interface PaymentMerchant {
  id: string;
  displayName: string;
  legalName?: string | null;
  status: 'active' | 'suspended' | 'disabled';
  metadata?: Record<string, unknown>;
}

export interface PaymentProviderAccount {
  id: string;
  merchantId: string;
  provider: string;
  environment: 'test' | 'sandbox' | 'production';
  credentialsRef?: string | null;
  publicConfig?: Record<string, unknown>;
  status: 'active' | 'disabled';
  metadata?: Record<string, unknown>;
}

export interface ExternalPayableRef {
  sourceApp: string;
  externalTenantId?: string | null;
  externalOutletId?: string | null;
  externalLocationId?: string | null;
  externalPayableType: string;
  externalPayableId: string;
}
```

No DB migration is required in Phase 8A unless the agent can add a safe dev-only migration without disrupting tests. Prefer contract-first for Phase 8A.

---

## Task 3 — Create `apps/payment-engine-service`

Create a new workspace app.

Recommended package name:

```json
"name": "@pos/payment-engine-service"
```

Required files:

```text
apps/payment-engine-service/package.json
apps/payment-engine-service/tsconfig.json
apps/payment-engine-service/src/index.ts
apps/payment-engine-service/src/app.ts
apps/payment-engine-service/src/routes/health.ts
apps/payment-engine-service/src/config/env.ts
```

Minimum behavior:

- Express app.
- `GET /health` returns:

```json
{ "ok": true, "service": "payment-engine-service" }
```

- `GET /version` returns package/service info.
- No dependency on AuraPoS POS terminal frontend.
- No dependency on order routes.
- No hard dependency on AuraPoS tenant middleware.
- Reads its own env vars from `PAYMENT_ENGINE_SERVICE_PORT` or `PORT` with default `5100`.

Add scripts in the app package:

```json
"dev": "tsx --tsconfig tsconfig.json src/index.ts",
"type-check": "tsc -p tsconfig.json --noEmit"
```

Do not change root `dev` to point to this service yet.

---

## Task 4 — Create `packages/payment-engine-client-sdk`

Create a new workspace package.

Recommended package name:

```json
"name": "@pos/payment-engine-client-sdk"
```

Required files:

```text
packages/payment-engine-client-sdk/package.json
packages/payment-engine-client-sdk/tsconfig.json
packages/payment-engine-client-sdk/src/index.ts
packages/payment-engine-client-sdk/src/client.ts
packages/payment-engine-client-sdk/src/types.ts
packages/payment-engine-client-sdk/src/errors.ts
```

SDK requirements:

- Fetch-compatible; do not require browser-only APIs beyond `fetch`.
- Constructor accepts:

```ts
{
  baseUrl: string;
  serviceToken?: string;
  merchantId?: string;
  sourceApp?: string;
}
```

- Methods:

```ts
createPaymentIntent(input)
createGatewayPayment(intentId, input)
getPaymentIntentStatus(intentId)
getRefundability(intentId)
```

- Use `/v1/...` paths for standalone service target.
- Support custom headers:

```text
x-payment-engine-service-token
x-payment-merchant-id
x-source-app
```

- Throw typed `PaymentEngineClientError` on non-2xx responses.

No React dependency.
No AuraPoS tenant dependency.

---

## Task 5 — Add package exports and type-check integration

Ensure the new packages participate in workspace type-check.

Update only what is necessary:

- package-level `package.json`
- `tsconfig.json`
- maybe root path aliases if current repo uses them

Do not break existing imports.
Do not rename existing `@pos/domain/payments` imports in this phase unless very small and safe.

Acceptance:

- `npm run check` or `pnpm run check` works if it worked before.
- New packages type-check individually.
- Existing AuraPoS API still type-checks.

---

## Task 6 — Add migration/extraction roadmap doc

Create:

```text
docs/payment-engine-hybrid-standalone-architecture.md
```

Must explain:

- Why Model 3 hybrid was chosen.
- Difference between:
  - `payment-engine-core`
  - `payment-engine-service`
  - `payment-engine-client-sdk`
- Current embedded AuraPoS payment engine status.
- Target standalone identity model:
  - merchantId
  - sourceApp
  - externalTenantId
  - externalPayableId
  - providerAccountId
- What happens to AuraPoS `tenantId`:
  - no longer primary payment identity long-term;
  - temporary compatibility source for `merchantId` during embedded dev.
- Extraction phases after 8A:

Suggested next phases:

```text
8B — Move framework-agnostic domain/application contracts into payment-engine-core
8C — Move DB schema/repositories behind payment-engine-service infrastructure boundary
8D — Wire payment-engine-service to real Postgres + FakeGateway/Xendit providers
8E — Make AuraPoS consume payment-engine-client-sdk instead of internal use cases
8F — Remove embedded payment-engine routes from AuraPoS API after parity
```

---

## Task 7 — Add report

Create:

```text
docs/reports/payment-engine-phase-8a-hybrid-standalone-extraction-report.md
```

Report must include:

- summary;
- files created/changed;
- packages/apps created;
- what compiles;
- what remains embedded;
- tenant/merchant identity decision;
- no old data compatibility assumption;
- no production migration assumption;
- tests/checks run;
- known limitations;
- explicit confirmation that no real provider behavior changed;
- explicit confirmation that Xendit sandbox adapter remains intact;
- explicit confirmation that FakeGateway remains intact;
- explicit confirmation that provider-level refund/cancel was not implemented;
- explicit confirmation that POS UI/order adapter was not implemented;
- explicit confirmation that legacy order payment flow was not intentionally changed.

---

## Commands to run

Run available checks:

```bash
npm run check
```

If package-specific checks are easier:

```bash
pnpm --filter @pos/payment-engine-core type-check
pnpm --filter @pos/payment-engine-service type-check
pnpm --filter @pos/payment-engine-client-sdk type-check
```

Run existing payment engine tests if practical:

- Phase 7A Xendit integration tests
- FakeGateway E2E tests
- provider contract tests

If any command fails, report exact relevant error summary. Do not fake success.

## Commit

Commit with a clear message, for example:

```text
feat(payment-engine): scaffold hybrid standalone architecture
```

Final Replit response must include:

- summary;
- commit SHA;
- files changed;
- checks/tests run;
- known issues;
- confirmation that no provider behavior was changed;
- confirmation that no POS UI/order adapter was implemented.
