# Codex Prompt — Payment Orchestration Phase 8G/8H Hardening + Phase 8I

Use this prompt in Codex.

You are working in the AuraPoS repository.

This is a combined phase:

```text
8G/8H Hardening — fix remaining standalone boundary/provider runtime gaps
8I — Standalone Runtime Readiness + Operations Layer
```

Current reviewed baseline:

```text
42bce606c08e47f5644b1dcd0cec4227323894fa
```

## Main target

Make Northflow Payment Orchestration closer to being a real standalone service that can later be extracted from AuraPoS.

This phase is **not** about AuraPoS SDK integration.

The goal is to move from:

```text
NOT_READY_PROVIDER_RUNTIME_GAPS
```

toward one of:

```text
STANDALONE_RUNTIME_READY_FOR_EXTRACTION_SIMULATION
NOT_READY_SCHEMA_EXTRACTION_BLOCKER
NOT_READY_PROVIDER_RUNTIME_BLOCKER
NOT_READY_OPERATIONS_BLOCKER
NOT_READY_TEST_FAILURES
```

Do not claim fully standalone-ready unless schema ownership, runtime provider configuration, operations entry points, and tests are actually ready enough for extraction simulation.

---

## Read first

Read these before coding:

```text
replit.md
PLANS.md
.agents/memory/MEMORY.md

docs/payment-orchestration-hybrid-standalone-architecture.md
docs/payment-orchestration-service-smoke-test.md

docs/reports/payment-orchestration-phase-8g-boundary-audit.md
docs/reports/payment-orchestration-schema-extraction-plan.md
docs/reports/payment-orchestration-provider-refund-cancel-contract.md
docs/reports/payment-orchestration-phase-8g-8h-standalone-boundary-provider-runtime-report.md
```

Inspect current standalone source:

```text
packages/payment-orchestration-core
packages/payment-orchestration-client-sdk
apps/payment-orchestration-service
shared/schema.ts
migrations/*payment_orchestration*
```

Embedded runtime may be inspected only for comparison. Do not modify it:

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
Midtrans adapter
Stripe adapter
platform settlement/payout
production credential manager with real secrets storage
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
standalone payment-orchestration packages/service
standalone schema module/migration ownership preparation
standalone workers/runners
standalone provider runtime config
standalone tests/docs/reports
comment/doc cleanup that removes outdated AuraPoS SDK-first wording
```

---

# Part A — 8G/8H Hardening

## Task A1 — Fix misleading comments/docs that still point to AuraPoS SDK integration

Current known stale examples:

```text
packages/payment-orchestration-core/src/domain/PaymentIntent.ts
providerRegistry.ts comments mentioning old phase/provider wiring wording
architecture docs if they still imply AuraPoS integration is next
```

Replace with standalone-first wording:

```text
Standalone extraction first. Source applications integrate only after service/package boundary, provider runtime, operations, and extraction simulation are stable.
```

Do not rename public APIs just for comments.

## Task A2 — Xendit sandbox runtime HTTP client policy

Current issue:

`xendit_sandbox` provider exists, but default registry uses an unconfigured HTTP client that throws. This is acceptable as foundation, but not enough for runtime readiness.

Required:

1. Add an explicit runtime HTTP client factory for standalone service, e.g.:

```text
apps/payment-orchestration-service/src/infrastructure/providers/xenditHttpClient.ts
```

2. It must use native `fetch` or a small injectable wrapper.
3. It must be disabled unless explicitly enabled by env.
4. Add env config docs for:

```text
PAYMENT_ORCHESTRATION_XENDIT_SANDBOX_ENABLED=true/false
PAYMENT_ORCHESTRATION_XENDIT_BASE_URL
PAYMENT_ORCHESTRATION_XENDIT_CALLBACK_TOKEN
```

5. `credentialsRef` must still resolve to env var names only. Do not store raw secrets in DB.
6. In test/non-production, provider registry may register xendit_sandbox with mock/default client only if safe. In real runtime, it should either be explicitly configured or return a clear `PROVIDER_HTTP_CLIENT_UNCONFIGURED` error.

Acceptance:

- Xendit provider runtime behavior is explicit and documented.
- Tests do not call live network.
- No raw credentials are persisted or returned.

## Task A3 — Standalone schema module foundation

Current blocker:

`payment_orchestration_*` schema is still in `shared/schema.ts`.

Do not perform a risky full migration, but create a low-risk standalone schema ownership foundation:

Preferred:

```text
apps/payment-orchestration-service/src/infrastructure/schema.ts
```

It may initially re-export the payment orchestration tables from `shared/schema.ts` with a clear TODO/extraction note, or duplicate definitions only if tests prove no drift.

Then update standalone repositories/mappers to import from this service-local schema module instead of importing directly from `../../../../shared/schema` or similar.

Goal:

```text
repository code depends on payment-orchestration-service schema boundary, not directly on AuraPoS shared schema path.
```

Add a report section explaining whether this is a re-export bridge or full schema relocation.

## Task A4 — Clean provider/runtime drift from root check fixes

Keep root `npm run check` passing. If type changes were made only to satisfy tests, ensure they are semantically correct and not hiding incompatible states.

Check especially:

```text
PaymentIntent comments/statuses
PaymentMerchant sourceApp/externalRef
PaymentTransaction statuses including reversed/ignored
```

Add tests only if needed.

---

# Part B — 8I Standalone Runtime Readiness + Operations Layer

## Task B1 — Expire stale transactions use case

Add standalone use case:

```text
apps/payment-orchestration-service/src/application/use-cases/ExpireStalePaymentTransactions.ts
```

Behavior:

- Finds pending/requires_action transactions or intents that are expired by `expiresAt`.
- Marks transactions as `expired` only if not terminal.
- Updates affected intent status/totals consistently.
- Merchant-safe and idempotent.
- No scheduler yet required, but use case must be callable manually/future worker.

If repository lacks query method, add a minimal repository method such as:

```ts
findStalePendingTransactions(input: { now: Date; limit: number }): Promise<StandalonePaymentTransactionDTO[]>
```

or implement a service-level method if cleaner.

## Task B2 — Reconciliation runner / worker entry point

A manual reconcile use case already exists. Add an operations runner foundation:

```text
apps/payment-orchestration-service/src/workers/reconcile.ts
apps/payment-orchestration-service/src/workers/expireStale.ts
```

It should be callable from tests or CLI without starting Express.

No cron scheduler required in this phase. But document how it would be scheduled later.

## Task B3 — Provider event retry/reprocess foundation

Add use case:

```text
apps/payment-orchestration-service/src/application/use-cases/ReprocessProviderEvents.ts
```

Behavior:

- Finds stale/pending/failed provider events via existing provider event repo.
- Reprocesses only safe events with parsed payload available or returns clear skipped reason.
- Does not double-apply processed events.
- Produces summary counts: processed, skipped, failed.

If raw body cannot be reconstructed safely from stored event rows, document limitation and implement safe skipped behavior.

## Task B4 — Error normalization and operational logging

Add a small standalone error-code normalization helper if not already present:

```text
apps/payment-orchestration-service/src/application/errors.ts
```

Map provider/runtime errors to stable public codes, for example:

```text
PROVIDER_HTTP_CLIENT_UNCONFIGURED
PROVIDER_CREDENTIALS_UNAVAILABLE
PROVIDER_ACCOUNT_REQUIRED
WEBHOOK_SIGNATURE_INVALID
WEBHOOK_BODY_INVALID
OVERPAYMENT_REJECTED
IDEMPOTENCY_CONFLICT
```

Do not overbuild logging. Add a minimal logger wrapper or document current console usage.

## Task B5 — Operational health/readiness endpoint

Add or extend existing health/version routes with a readiness endpoint, for example:

```text
GET /ready
```

It should report non-secret readiness info:

```json
{
  "ok": true,
  "service": "payment-orchestration-service",
  "providers": {
    "fake_gateway": { "registered": true },
    "xendit_sandbox": { "registered": true, "configured": false }
  },
  "database": "configured"
}
```

Do not expose secrets or raw env values.

## Task B6 — Tests

Add/update tests for:

```text
schema module boundary import
xendit runtime HTTP client policy without live network
expire stale transaction use case
worker/runner callable without Express
provider event reprocess safe skip/summary
ready endpoint does not expose secrets
root check remains pass
```

Preferred test files:

```text
apps/api/src/__tests__/payment-orchestration-schema-boundary.test.ts
apps/api/src/__tests__/payment-orchestration-xendit-runtime-config.test.ts
apps/api/src/__tests__/payment-orchestration-expire-stale.test.ts
apps/api/src/__tests__/payment-orchestration-workers.test.ts
apps/api/src/__tests__/payment-orchestration-provider-event-reprocess.test.ts
apps/api/src/__tests__/payment-orchestration-ready-endpoint.test.ts
```

No live Xendit call.

---

# Documentation and reports

Create final report:

```text
docs/reports/payment-orchestration-phase-8g8h-hardening-8i-runtime-readiness-report.md
```

Report must include:

```text
summary
files changed
stale comment/docs cleanup
xendit runtime config policy
schema boundary module status
expire stale status
worker/runner status
provider event reprocess status
error normalization/logging status
readiness endpoint status
tests added/updated
Commands Run table
known limitations
final decision
next recommended phase
guardrail confirmations
```

Update:

```text
docs/payment-orchestration-hybrid-standalone-architecture.md
docs/payment-orchestration-service-smoke-test.md
```

Roadmap should remain standalone-first:

```text
8I — Operations Layer + Runtime Readiness
8J — SDK/API Contract Freeze + Deployment Readiness
8K — Extraction Simulation
8L — Extract to Standalone Repo/Package
8M — Integrate AuraPoS/Other Apps
```

---

# Commands to run

Run:

```bash
pnpm --filter @northflow/payment-orchestration-core type-check
pnpm --filter @northflow/payment-orchestration-service type-check
pnpm --filter @northflow/payment-orchestration-client-sdk type-check
npm run check
```

Run existing relevant tests:

```bash
npx tsx --tsconfig apps/api/tsconfig.node.json --test apps/api/src/__tests__/payment-orchestration-service-fakegateway-flow.test.ts
npx tsx --tsconfig apps/api/tsconfig.node.json --test apps/api/src/__tests__/payment-orchestration-standalone-webhook.test.ts
npx tsx --tsconfig apps/api/tsconfig.node.json --test apps/api/src/__tests__/payment-orchestration-provider-status-refresh.test.ts
npx tsx --tsconfig apps/api/tsconfig.node.json --test apps/api/src/__tests__/payment-orchestration-xendit-standalone-provider.test.ts
npx tsx --tsconfig apps/api/tsconfig.node.json --test apps/api/src/__tests__/payment-orchestration-xendit-standalone-webhook.test.ts
npx tsx --tsconfig apps/api/tsconfig.node.json --test apps/api/src/__tests__/payment-orchestration-boundary-purity.test.ts
```

Run every new test you add.

Do not fake results. If a command fails, document exact error and whether it blocks standalone readiness.

---

# Acceptance criteria

Accepted only if:

```text
1. Stale AuraPoS-integration-first comments are removed or corrected.
2. Xendit runtime HTTP client policy is explicit and tested without live network.
3. Standalone schema boundary module exists and repositories import through it.
4. Expire stale transactions use case exists or is explicitly blocked with reason.
5. Worker/runner foundation exists for operations use cases.
6. Provider event reprocess foundation exists or safely reports limitations.
7. Readiness endpoint exists and does not expose secrets.
8. Root check and package type-checks pass, or failures are honestly reported as blockers.
9. Report exists with final decision.
10. No AuraPoS SDK integration was implemented.
11. No embedded payment runtime or legacy order payment was intentionally changed.
```

Final decision must be one of:

```text
STANDALONE_RUNTIME_READY_FOR_EXTRACTION_SIMULATION
NOT_READY_SCHEMA_EXTRACTION_BLOCKER
NOT_READY_PROVIDER_RUNTIME_BLOCKER
NOT_READY_OPERATIONS_BLOCKER
NOT_READY_TEST_FAILURES
```

---

# Commit

If code was implemented:

```text
feat(payment-orchestration): harden standalone runtime operations readiness
```

If mostly docs/audit:

```text
docs(payment-orchestration): add standalone runtime readiness plan
```

Final Codex response must include:

```text
summary
commit SHA
files changed
8G/8H hardening fixes
8I runtime operations implemented
tests/checks run
final standalone runtime decision
next recommended phase
confirmation that no AuraPoS SDK integration was implemented
confirmation that no embedded payment runtime was intentionally changed
confirmation that no legacy order payment flow was intentionally changed
```
