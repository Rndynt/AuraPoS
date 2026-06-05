# Replit Agent Prompt — Payment Orchestration Phase 8A Hardening

Use this prompt in Replit Agent.

You are working in the AuraPoS repository.

This is **Payment Orchestration Phase 8A Hardening**.

This hardening fixes the scaffold created in Phase 8A:

- Rename standalone payment packages from `@pos/*` to neutral `@northflow/*`.
- Rename the module from `payment-engine` to `payment-orchestration`.
- Keep the hybrid model:
  - `payment-orchestration-core`
  - `payment-orchestration-service`
  - `payment-orchestration-client-sdk`
- Fix service/SDK route mismatch.
- Sync SDK request types with core contracts.
- Fix docs naming and report audit details.

Current accepted Phase 8A base:

- `c6d26d676df09ee60c5ef59fd17eb2446ab6f7f7`

Read first:

- `docs/payment-engine-hybrid-standalone-architecture.md`
- `docs/reports/payment-engine-phase-8a-hybrid-standalone-extraction-report.md`
- `docs/replit-agent-payment-engine-phase-8a-hybrid-standalone-extraction-prompt.md`

## User decision

The user wants the standalone reusable payment system to use:

```text
@northflow/*
payment-orchestration
```

Do not use:

```text
@pos/payment-engine-*
@rndynt/*
payment-engine-* for the standalone packages/apps
payment-orc
```

Rationale:

- `@pos` is too coupled to AuraPoS / POS.
- This orchestration system should be reusable by AuraPoS, Transity, KiosKoin, photography apps, and future projects.
- `payment-orchestration` is clearer and more professional than `payment-orc`.

## Guardrails

Do not implement unrelated features:

- no real provider behavior changes
- no Xendit behavior changes
- no FakeGateway behavior changes
- no provider-level refund/cancel
- no Midtrans adapter
- no Stripe adapter
- no scheduled cron/worker layer
- no external provider polling endpoint
- no POS UI changes
- no order adapter
- no split bill
- no customer ledger
- no stock reservation
- no PPOB wallet/credit
- no platform-managed settlement/payout

Do not intentionally modify legacy order payment flow:

- `/api/orders/:id/payments`
- `/api/orders/create-and-pay`
- `packages/application/orders/RecordPayment.ts`
- `packages/application/orders/CreateAndPayOrder.ts`
- `apps/api/src/http/routes/orders.ts`
- `order_payments` legacy table behavior

Existing embedded AuraPoS payment-engine routes must remain operational.

---

## Main goal

Rename and harden the Phase 8A hybrid scaffold so the standalone system is correctly branded and internally consistent:

```text
packages/payment-orchestration-core
apps/payment-orchestration-service
packages/payment-orchestration-client-sdk
```

Package names:

```text
@northflow/payment-orchestration-core
@northflow/payment-orchestration-service
@northflow/payment-orchestration-client-sdk
```

The existing embedded AuraPoS payment engine can still use its old internal file names for now. This phase focuses on the new standalone scaffold only.

---

## Task 1 — Rename folders with `git mv`

Rename Phase 8A scaffold folders:

```text
packages/payment-engine-core
→ packages/payment-orchestration-core

packages/payment-engine-client-sdk
→ packages/payment-orchestration-client-sdk

apps/payment-engine-service
→ apps/payment-orchestration-service
```

Use `git mv` if possible so history remains clean.

Do not rename existing embedded AuraPoS payment engine folders/files in `packages/application/payments`, `packages/domain/payments`, `packages/infrastructure/payments`, or `apps/api/src/http/routes/payment-engine.ts` in this phase.

---

## Task 2 — Rename package names and dependencies

Update package names:

### Core

```json
{
  "name": "@northflow/payment-orchestration-core"
}
```

### Service

```json
{
  "name": "@northflow/payment-orchestration-service",
  "dependencies": {
    "@northflow/payment-orchestration-core": "workspace:*"
  }
}
```

### Client SDK

```json
{
  "name": "@northflow/payment-orchestration-client-sdk"
}
```

Remove standalone scaffold usage of:

```text
@pos/payment-engine-core
@pos/payment-engine-service
@pos/payment-engine-client-sdk
```

Search the repo and update all references in:

- package.json files
- TypeScript imports
- docs
- reports
- example snippets
- commands

Keep existing non-standalone AuraPoS package names untouched unless they are references to the new scaffold.

---

## Task 3 — Update imports and public API comments

Update imports such as:

```ts
import type { ... } from '@pos/payment-engine-core'
```

to:

```ts
import type { ... } from '@northflow/payment-orchestration-core'
```

Update public API comments:

```text
@pos/payment-engine-core
→ @northflow/payment-orchestration-core

@pos/payment-engine-client-sdk
→ @northflow/payment-orchestration-client-sdk
```

Update service logs/messages:

```text
payment-engine-service
→ payment-orchestration-service
```

Endpoint naming may remain `/v1/payment-intents` because the API resource is still a payment intent. Do not rename API resource routes to `/v1/orchestration-intents` or anything awkward.

---

## Task 4 — Update root/project references and workspace commands

Update root `tsconfig.json` references:

```text
./packages/payment-engine-core/tsconfig.json
→ ./packages/payment-orchestration-core/tsconfig.json

./packages/payment-engine-client-sdk/tsconfig.json
→ ./packages/payment-orchestration-client-sdk/tsconfig.json

./apps/payment-engine-service/tsconfig.json
→ ./apps/payment-orchestration-service/tsconfig.json
```

Update docs/scripts/commands:

```bash
pnpm --filter @pos/payment-engine-service dev
```

to:

```bash
pnpm --filter @northflow/payment-orchestration-service dev
```

Update type-check command examples accordingly.

---

## Task 5 — Fix service/SDK route mismatch for refundability

Current Phase 8A issue:

The SDK exposes:

```ts
getRefundability(intentId)
```

which calls:

```text
GET /v1/payment-intents/:id/refundability
```

But the service scaffold does not define a matching placeholder route, so it returns 404 instead of the intended 501.

Required:

Add placeholder route to the standalone service:

```text
GET /v1/payment-intents/:id/refundability
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

HTTP status: `501`.

Update docs route inventory to include it.

---

## Task 6 — Sync SDK create intent request with core contract

Current mismatch:

Core `CreatePaymentIntentInput` includes:

```ts
merchantId: string;
sourceApp?: string | null;
externalTenantId?: string | null;
externalOutletId?: string | null;
externalLocationId?: string | null;
externalPayableType: string;
externalPayableId: string;
currency: string;
amountDue: number;
```

SDK `CreatePaymentIntentRequest` currently lacks some optional external context fields.

Required:

Update SDK type:

```ts
export interface CreatePaymentIntentRequest {
  merchantId?: string;
  sourceApp?: string | null;
  externalTenantId?: string | null;
  externalOutletId?: string | null;
  externalLocationId?: string | null;
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

Also update any SDK usage examples to show `sourceApp` and/or explain that constructor defaults may supply `sourceApp`/`merchantId` via headers.

---

## Task 7 — Fix docs naming mismatch

Current docs mention:

```text
PaymentScope.createAuraPosPaymentScope()
```

But actual implementation exports a function:

```ts
createAuraPosPaymentScope()
```

Required:

Replace docs references with:

```text
createAuraPosPaymentScope()
```

Also update docs/reports from:

```text
Payment Engine
payment-engine-core
payment-engine-service
payment-engine-client-sdk
@pos/payment-engine-*
```

to:

```text
Payment Orchestration
payment-orchestration-core
payment-orchestration-service
payment-orchestration-client-sdk
@northflow/payment-orchestration-*
```

Important nuance:

- Existing historical report names can stay as filenames if already committed, but the current Phase 8A docs/report should describe the new naming clearly.
- If renaming doc filenames is low-risk, prefer new names:
  - `docs/payment-orchestration-hybrid-standalone-architecture.md`
  - `docs/reports/payment-orchestration-phase-8a-hardening-report.md`
- Do not delete historical reports unless necessary.

---

## Task 8 — Update service identity strings

Update service visible strings from `payment-engine-service` to `payment-orchestration-service` where they refer to the new standalone app.

Examples:

```json
{ "ok": true, "service": "payment-orchestration-service" }
```

```text
[payment-orchestration-service] Phase 8A listening on port 5100
```

Error messages can say `Payment Orchestration Service`.

The service token env var can remain:

```text
PAYMENT_ENGINE_SERVICE_TOKEN
```

or may be renamed to:

```text
PAYMENT_ORCHESTRATION_SERVICE_TOKEN
```

Recommendation for this hardening:

- Support both env vars.
- Prefer `PAYMENT_ORCHESTRATION_SERVICE_TOKEN` in new docs.
- Keep `PAYMENT_ENGINE_SERVICE_TOKEN` as backwards-compatible alias during monorepo transition.

Same for port:

- Prefer `PAYMENT_ORCHESTRATION_SERVICE_PORT`.
- Keep `PAYMENT_ENGINE_SERVICE_PORT` alias if already implemented.

---

## Task 9 — Add explicit Commands Run section in report

Current Phase 8A report mentions type-check commands but does not clearly state pass/fail/not-run.

Create a new hardening report:

```text
docs/reports/payment-orchestration-phase-8a-hardening-report.md
```

It must include:

- summary;
- files/folders renamed;
- package names before/after;
- service route mismatch fix;
- SDK contract sync fix;
- docs naming fixes;
- env var compatibility decision;
- commands run with pass/fail/not-run:
  - `npm run check`
  - `pnpm --filter @northflow/payment-orchestration-core type-check`
  - `pnpm --filter @northflow/payment-orchestration-service type-check`
  - `pnpm --filter @northflow/payment-orchestration-client-sdk type-check`
- known limitations;
- explicit confirmation that no real provider behavior changed;
- explicit confirmation that Xendit sandbox adapter remains intact;
- explicit confirmation that FakeGateway remains intact;
- explicit confirmation that provider-level refund/cancel was not implemented;
- explicit confirmation that POS UI/order adapter was not implemented;
- explicit confirmation that legacy order payment flow was not intentionally changed.

If a command fails, report the exact relevant error summary and fix if within scope.

---

## Task 10 — Optional package alias safety

If TypeScript path aliases are needed for the new `@northflow/*` package import in local workspace, update the correct tsconfig path alias file.

Do not break existing `@pos/*` aliases used by AuraPoS.

The standalone package imports should resolve through workspace package names or path aliases consistently.

---

## Acceptance criteria

1. No references to `@pos/payment-engine-core`, `@pos/payment-engine-service`, or `@pos/payment-engine-client-sdk` remain in the new standalone scaffold/docs.
2. New package names are:
   - `@northflow/payment-orchestration-core`
   - `@northflow/payment-orchestration-service`
   - `@northflow/payment-orchestration-client-sdk`
3. New folders are:
   - `packages/payment-orchestration-core`
   - `apps/payment-orchestration-service`
   - `packages/payment-orchestration-client-sdk`
4. Root `tsconfig.json` references the renamed folders.
5. Service has placeholder `GET /v1/payment-intents/:id/refundability` returning 501.
6. SDK `CreatePaymentIntentRequest` includes `sourceApp`, `externalTenantId`, `externalOutletId`, and `externalLocationId` optional fields.
7. Docs use `Payment Orchestration` and `createAuraPosPaymentScope()` correctly.
8. Existing embedded AuraPoS payment-engine behavior is unchanged.
9. Xendit sandbox and FakeGateway provider behavior are unchanged.
10. Checks/tests are run and reported honestly.

---

## Commands to run

Run:

```bash
npm run check
```

Run package checks:

```bash
pnpm --filter @northflow/payment-orchestration-core type-check
pnpm --filter @northflow/payment-orchestration-service type-check
pnpm --filter @northflow/payment-orchestration-client-sdk type-check
```

If practical, run existing payment tests:

```bash
npx tsx --tsconfig apps/api/tsconfig.node.json --test apps/api/src/__tests__/payment-xendit-gateway-integration.test.ts
```

Do not run live provider smoke tests unless explicitly configured.

## Commit

Commit with a clear message, for example:

```text
refactor(payment-orchestration): rename standalone scaffold to northflow
```

Final Replit response must include:

- summary;
- commit SHA;
- files/folders renamed;
- checks/tests run;
- known issues;
- confirmation that no provider behavior changed;
- confirmation that no POS UI/order adapter was implemented;
- confirmation that legacy order payment flow was not intentionally changed.
