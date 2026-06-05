# Codex Prompt — Payment Orchestration Phase 8G + 8H

Use this prompt in Codex.

You are working in the AuraPoS repository.

This is a combined phase:

```text
Phase 8G — Standalone Boundary Purity + Extraction Readiness
Phase 8H — Standalone Provider Runtime Completion
```

Current accepted baseline:

```text
c1b5befd533336f960eb849e8dedb767eb181c58
```

## Goal

Make Northflow Payment Orchestration closer to being extracted from AuraPoS as a standalone product/service.

This phase is **not** about integrating AuraPoS with the SDK.

This phase is about:

```text
1. proving the payment-orchestration packages/service have clean standalone boundaries;
2. removing or documenting any remaining AuraPoS/@pos coupling;
3. completing provider runtime foundations beyond FakeGateway, especially Xendit sandbox path;
4. adding provider runtime tests/docs/reports;
5. producing a clear extraction readiness decision.
```

## Important correction

Do not optimize this phase around `READY_FOR_AURAPOS_FAKEGATEWAY_INTEGRATION`.

The new target decision is one of:

```text
STANDALONE_BOUNDARY_AND_PROVIDER_RUNTIME_READY
NOT_READY_BOUNDARY_LEAKS
NOT_READY_PROVIDER_RUNTIME_GAPS
NOT_READY_RUNTIME_TEST_FAILURES
```

---

## Read first

Read:

```text
replit.md
.agents/memory/MEMORY.md
PLANS.md

docs/payment-orchestration-hybrid-standalone-architecture.md
docs/payment-orchestration-service-smoke-test.md

docs/reports/payment-orchestration-phase-8f-parity-matrix.md
docs/reports/payment-orchestration-phase-8f-readiness-decision.md
docs/reports/payment-orchestration-phase-8f-standalone-readiness-report.md
```

Inspect standalone packages/service:

```text
packages/payment-orchestration-core
packages/payment-orchestration-client-sdk
apps/payment-orchestration-service
shared/schema.ts
migrations/*payment_orchestration*
```

Inspect embedded runtime only for comparison. Do not change it:

```text
apps/api/src/http/routes/payment-engine.ts
packages/application/payments/*
packages/domain/payments/*
packages/infrastructure/payments/providers/*
```

---

## Guardrails

Do not implement:

```text
AuraPoS SDK consumption
embedded /api/payment-engine route deletion
legacy order payment migration
POS UI changes
order adapter migration
split bill UI
customer ledger
stock reservation
PPOB wallet/credit
platform settlement/payout
Midtrans adapter
Stripe adapter
production credential manager
```

Do not intentionally modify:

```text
apps/api/src/http/routes/payment-engine.ts
packages/application/payments/*
packages/domain/payments/*
packages/infrastructure/payments/providers/*
packages/application/orders/*
apps/api/src/http/routes/orders.ts
order_payments
```

Allowed:

```text
standalone payment-orchestration packages
standalone payment-orchestration service
standalone tests
docs/reports
small root-check/type drift fixes only if they are clearly payment-orchestration test/helper drift
```

---

# Part A — Phase 8G: Boundary Purity + Extraction Readiness

## Task A1 — Dependency boundary audit

Audit imports and package dependencies for:

```text
packages/payment-orchestration-core
packages/payment-orchestration-client-sdk
apps/payment-orchestration-service
```

Check for forbidden coupling:

```text
@pos/* imports
apps/api imports
AuraPoS tenant/session/order imports
legacy payment-engine imports
frontend/UI imports
process assumptions tied to AuraPoS API container
shared schema coupling that would block extraction
```

Create:

```text
docs/reports/payment-orchestration-phase-8g-boundary-audit.md
```

The audit must list:

```text
package/service
forbidden imports found
allowed workspace imports
external dependencies
extraction blockers
fixes made
remaining deferred items
```

## Task A2 — Fix small boundary leaks now

Fix small safe leaks immediately.

Examples of allowed fixes:

```text
rename comments/docs that still imply AuraPoS ownership
move reusable type from app-specific file to core if trivial
replace @pos alias import in standalone package with @northflow/core import
add missing package export
add explicit local import boundary comment
update tsconfig path aliases for @northflow packages
```

Do not do large moves in this phase, such as moving all schema out of `shared/schema.ts` into a new package. Instead, document extraction plan.

## Task A3 — Standalone migration/schema extraction plan

Current schema is likely still in `shared/schema.ts`. That is acceptable temporarily inside monorepo, but not sufficient for extraction.

Create:

```text
docs/reports/payment-orchestration-schema-extraction-plan.md
```

Include:

```text
current location of payment_orchestration_* tables
how to move schema into future standalone package/service
migration ownership plan
drizzle migration generation plan
backward compatibility while inside AuraPoS monorepo
risk list
recommended extraction sequence
```

No large schema relocation yet unless it is clearly low-risk and tests pass.

## Task A4 — Root check/type drift gate

`npm run check` currently fails on older payment-orchestration test/helper type drift.

Fix this in the same phase if failures are clearly related to payment-orchestration test/helper drift and not unrelated app issues.

Goal:

```text
npm run check should pass if practical.
```

If it cannot pass because of unrelated legacy issues, document exact files/errors and reason.

---

# Part B — Phase 8H: Provider Runtime Completion

## Task B1 — Standalone provider runtime contract

Ensure core/service has clear provider runtime contracts for:

```text
create payment
parse/verify webhook
poll provider status
refund/cancel capability flags
provider actions
provider errors
```

Do not overbuild. Add only what is needed to support FakeGateway plus Xendit sandbox path.

## Task B2 — Xendit sandbox standalone create payment

Implement or wire a standalone Xendit sandbox provider in:

```text
apps/payment-orchestration-service/src/infrastructure/providers
```

Requirements:

```text
provider code: xendit_sandbox
must be isolated from embedded AuraPoS provider runtime
must use provider account credentials_ref/public_config policy
must not store raw secrets in DB
must support sandbox/test mode only unless production env is explicitly configured
must return provider actions compatible with core action contract
must be covered by mocked tests, no live Xendit network call required
```

Allowed approaches:

```text
A. create a standalone XenditSandboxProvider using existing provider contract ideas;
B. wrap existing embedded Xendit provider only if no embedded runtime behavior changes and wrapper is isolated;
C. create a mockable HTTP client adapter for Xendit sandbox calls.
```

Preferred:

```text
create standalone provider with injectable HTTP client so tests do not call network.
```

## Task B3 — Xendit standalone webhook parser/verifier

Add standalone Xendit webhook handler/parser/verifier.

Requirements:

```text
route: POST /v1/webhooks/xendit_sandbox
verify callback token/signature according to current embedded test expectations or documented sandbox policy
parse event id, provider reference, event type, status
map to standalone transaction/intent update via HandleProviderWebhook path
support idempotent duplicate event handling
mocked tests only, no live network
```

If exact Xendit signature policy is not available in current code, use the embedded test contract as the source of truth and document limitations.

## Task B4 — Provider status polling foundation

Add minimal provider status polling foundation, not a scheduled worker.

Suggested route:

```text
POST /v1/payment-transactions/:id/refresh-provider-status
```

Rules:

```text
protected by service token
merchantId from body/query/header resolver
uses provider registry
for FakeGateway: deterministic no-op or test status lookup
for Xendit sandbox: mocked provider status client path
updates transaction/intent only through existing safe status update/reconcile path
```

If route is too much, add use case + tests and defer route with reason. But prefer route if low-risk.

## Task B5 — Provider-level refund/cancel contract design

Do not implement real provider refund/cancel money movement unless already safe.

In this phase, create contract and design doc:

```text
docs/reports/payment-orchestration-provider-refund-cancel-contract.md
```

Include:

```text
refund/cancel provider capability model
request/response shape
idempotency policy
financial integrity rules
provider event handling
what is implemented now vs deferred
```

If a small local no-provider refundability read/test fix is needed, it can be done. Do not add real Xendit refund/cancel unless thoroughly mocked and safe.

## Task B6 — Tests

Add/update tests for:

```text
boundary purity import scan or dependency audit snapshot
Xendit sandbox create payment with mocked HTTP client
Xendit sandbox webhook parse/verify with mocked payload
provider status refresh foundation
provider registry selection for fake_gateway and xendit_sandbox
no raw credential exposure
no AuraPoS tenantId in standalone public responses
```

Preferred files:

```text
apps/api/src/__tests__/payment-orchestration-boundary-purity.test.ts
apps/api/src/__tests__/payment-orchestration-xendit-standalone-provider.test.ts
apps/api/src/__tests__/payment-orchestration-xendit-standalone-webhook.test.ts
apps/api/src/__tests__/payment-orchestration-provider-status-refresh.test.ts
```

No live Xendit call.

---

# Documentation and reports

Create final combined report:

```text
docs/reports/payment-orchestration-phase-8g-8h-standalone-boundary-provider-runtime-report.md
```

Must include:

```text
summary
files changed
boundary audit result
schema extraction plan link
provider runtime changes
Xendit sandbox create payment status
Xendit webhook status
provider status polling status
refund/cancel contract status
small gaps fixed
large gaps deferred
tests added/updated
Commands Run table
final standalone readiness decision
next recommended phase
guardrail confirmations
```

Update architecture doc:

```text
docs/payment-orchestration-hybrid-standalone-architecture.md
```

Add Phase 8G+8H section and update roadmap to standalone-first:

```text
8G+8H — Boundary Purity + Provider Runtime Completion
8I — Operations Layer + Worker Readiness
8J — SDK/API Contract Freeze + Deployment Readiness
8K — Extraction Simulation
8L — Extract to Standalone Repo/Package
8M — Integrate AuraPoS/Other Apps
```

Do not mention AuraPoS integration as near-term target except as explicitly deferred until after standalone extraction readiness.

---

# Commands to run

Run:

```bash
pnpm --filter @northflow/payment-orchestration-core type-check
pnpm --filter @northflow/payment-orchestration-service type-check
pnpm --filter @northflow/payment-orchestration-client-sdk type-check
npm run check
```

Run relevant existing tests:

```bash
npx tsx --tsconfig apps/api/tsconfig.node.json --test apps/api/src/__tests__/payment-orchestration-service-fakegateway-flow.test.ts
npx tsx --tsconfig apps/api/tsconfig.node.json --test apps/api/src/__tests__/payment-orchestration-service-http-auth.test.ts
npx tsx --tsconfig apps/api/tsconfig.node.json --test apps/api/src/__tests__/payment-orchestration-atomic-confirm.test.ts
npx tsx --tsconfig apps/api/tsconfig.node.json --test apps/api/src/__tests__/payment-orchestration-standalone-webhook.test.ts
npx tsx --tsconfig apps/api/tsconfig.node.json --test apps/api/src/__tests__/payment-orchestration-webhook-route-auth-bypass.test.ts
npx tsx --tsconfig apps/api/tsconfig.node.json --test apps/api/src/__tests__/payment-orchestration-reconcile.test.ts
npx tsx --tsconfig apps/api/tsconfig.node.json --test apps/api/src/__tests__/payment-orchestration-client-sdk.test.ts
```

Run new tests you add.

Do not fake command results. If root check fails, document exact reason and whether it blocks extraction readiness.

---

# Acceptance criteria

Accepted only if:

```text
1. Boundary audit exists.
2. Schema extraction plan exists.
3. Standalone packages/service have no unresolved @pos/AuraPoS runtime imports, or leaks are documented as blockers.
4. Xendit sandbox standalone provider path exists or is explicitly blocked with reason.
5. Xendit standalone webhook path exists or is explicitly blocked with reason.
6. Provider status refresh foundation exists or is explicitly deferred with reason.
7. Provider refund/cancel contract document exists.
8. Tests added/updated for implemented provider/runtime work.
9. Commands Run table exists.
10. Final decision is one of:
   - STANDALONE_BOUNDARY_AND_PROVIDER_RUNTIME_READY
   - NOT_READY_BOUNDARY_LEAKS
   - NOT_READY_PROVIDER_RUNTIME_GAPS
   - NOT_READY_RUNTIME_TEST_FAILURES
11. No AuraPoS SDK integration was implemented.
12. No embedded payment runtime or legacy order payment was intentionally changed.
13. No accidental assets/logs/build output were committed.
```

---

# Commit

If mostly docs/audit:

```text
docs(payment-orchestration): add phase 8g 8h standalone readiness audit
```

If provider runtime code is implemented:

```text
feat(payment-orchestration): complete standalone boundary and provider runtime foundation
```

Final Codex response must include:

```text
summary
commit SHA
files changed
boundary leaks found/fixed
provider runtime implemented
tests/checks run
final standalone readiness decision
next recommended phase
confirmation that no AuraPoS SDK integration was implemented
confirmation that no embedded payment runtime was intentionally changed
confirmation that no legacy order payment flow was intentionally changed
```
