# Payment Orchestration Phase 8G+8H Standalone Boundary + Provider Runtime Report

Date: 2026-06-05

## Summary

Phase 8G+8H completed the standalone boundary audit, documented schema extraction, added standalone provider runtime foundations, wired `xendit_sandbox` sandbox create-payment/webhook/polling foundations, added status refresh routing, and added tests for the implemented work.

## Files Changed

- `apps/payment-orchestration-service/src/infrastructure/providers/StandalonePaymentProvider.ts`
- `apps/payment-orchestration-service/src/infrastructure/providers/StandaloneFakeGatewayProvider.ts`
- `apps/payment-orchestration-service/src/infrastructure/providers/XenditSandboxProvider.ts`
- `apps/payment-orchestration-service/src/infrastructure/providers/providerRegistry.ts`
- `apps/payment-orchestration-service/src/application/use-cases/CreateGatewayPayment.ts`
- `apps/payment-orchestration-service/src/application/use-cases/HandleProviderWebhook.ts`
- `apps/payment-orchestration-service/src/application/use-cases/RefreshProviderStatus.ts`
- `apps/payment-orchestration-service/src/routes/transactions.ts`
- `apps/payment-orchestration-service/src/app.ts`
- `apps/payment-orchestration-service/src/container.ts`
- `apps/api/src/__tests__/payment-orchestration-boundary-purity.test.ts`
- `apps/api/src/__tests__/payment-orchestration-xendit-standalone-provider.test.ts`
- `apps/api/src/__tests__/payment-orchestration-xendit-standalone-webhook.test.ts`
- `apps/api/src/__tests__/payment-orchestration-provider-status-refresh.test.ts`
- `docs/reports/payment-orchestration-phase-8g-boundary-audit.md`
- `docs/reports/payment-orchestration-schema-extraction-plan.md`
- `docs/reports/payment-orchestration-provider-refund-cancel-contract.md`
- `docs/payment-orchestration-hybrid-standalone-architecture.md`
- `PLANS.md`

## Boundary Audit Result

See `docs/reports/payment-orchestration-phase-8g-boundary-audit.md`.

Result: no forbidden AuraPoS runtime imports were found in standalone package/service source. The main deferred extraction blocker is temporary Drizzle schema/migration ownership in `shared/schema.ts` and root `migrations/`.

## Schema Extraction Plan Link

See `docs/reports/payment-orchestration-schema-extraction-plan.md`.

## Provider Runtime Changes

Implemented standalone provider contract for:

- create payment
- parse/verify webhook
- poll provider status
- capability flags
- provider actions returned by existing transaction serialization
- provider error surfacing through existing service error middleware

## Xendit Sandbox Create Payment Status

Implemented as `XenditSandboxProvider` with:

- provider code `xendit_sandbox`
- injectable HTTP client for mocked tests/no live network calls
- opaque `credentialsRef` resolver
- sandbox/test-only provider account validation
- sanitized raw provider responses
- redirect invoice action via provider payment URL

Default registry runtime intentionally uses an unconfigured HTTP client until deployment/credential policy is finalized; tests inject a mock client.

## Xendit Webhook Status

Implemented parser/verifier for `POST /v1/webhooks/xendit_sandbox` through the existing webhook route and generalized `HandleProviderWebhook` provider registry path.

- Verifies `x-callback-token` against `PAYMENT_ORCHESTRATION_XENDIT_CALLBACK_TOKEN` when configured.
- Parses event id/reference/type/status from invoice-style payloads.
- Maps `PAID`/`SUCCEEDED`/`SETTLED` to standalone `succeeded`, `FAILED` to `failed`, `EXPIRED` to `expired`, and cancel-like statuses to `cancelled`.
- Reuses existing provider-event idempotency path.

## Provider Status Polling Status

Implemented foundation:

```text
POST /v1/payment-transactions/:id/refresh-provider-status
```

- Protected by the existing `/v1` service-token middleware.
- Resolves `merchantId` from body/header.
- Looks up transactions by `(transactionId, merchantId)`.
- Uses the provider registry and provider account repository.
- Updates transaction/intent through existing safe status transition logic.
- No scheduled worker was added.

## Refund/Cancel Contract Status

Design only. See `docs/reports/payment-orchestration-provider-refund-cancel-contract.md`.

No real Xendit refund/cancel money movement was added.

## Small Gaps Fixed

- Standalone provider runtime contract was formalized in service infrastructure.
- Xendit sandbox provider path is now isolated from embedded AuraPoS provider runtime.
- Webhook use case can use provider registry parsers beyond FakeGateway.
- Provider status refresh use case and route were added.
- Boundary-purity test added.

## Large Gaps Deferred

- Move payment-orchestration schema/migrations out of `shared/schema.ts` and root migrations.
- Configure production-grade credential manager/HTTP client wiring.
- Add scheduled stale expiration/reconciliation worker.
- Freeze SDK/API/error contract.
- Run extraction simulation in a clean workspace.
- Implement real provider refund/cancel after financial-integrity design is implemented with transactions and idempotency.

## Tests Added/Updated

- Boundary purity import scan test.
- Xendit sandbox create-payment provider test with mocked HTTP client.
- Xendit sandbox webhook parser/verifier test.
- Provider status refresh use-case test.

## Commands Run

| Command | Status | Notes |
|---|---:|---|
| `pnpm --filter @northflow/payment-orchestration-core type-check` | ✅ pass | Core contracts type-check. |
| `pnpm --filter @northflow/payment-orchestration-service type-check` | ✅ pass | Standalone service type-check. |
| `pnpm --filter @northflow/payment-orchestration-client-sdk type-check` | ✅ pass | SDK type-check. |
| `npm run check` | ✅ pass | Turbo type-check passed across all 13 workspace packages after fixing payment-orchestration test/helper type drift. |
| `npx tsx --tsconfig apps/api/tsconfig.node.json --test apps/api/src/__tests__/payment-orchestration-boundary-purity.test.ts` | ✅ pass | Boundary import scan test. |
| `npx tsx --tsconfig apps/api/tsconfig.node.json --test apps/api/src/__tests__/payment-orchestration-xendit-standalone-provider.test.ts` | ✅ pass | Xendit sandbox create-payment provider test. |
| `npx tsx --tsconfig apps/api/tsconfig.node.json --test apps/api/src/__tests__/payment-orchestration-xendit-standalone-webhook.test.ts` | ✅ pass | Xendit sandbox webhook parser/verifier test. |
| `npx tsx --tsconfig apps/api/tsconfig.node.json --test apps/api/src/__tests__/payment-orchestration-provider-status-refresh.test.ts` | ✅ pass | Provider status refresh foundation test. |
| Existing payment-orchestration regression tests listed in the phase prompt | ✅ pass | FakeGateway flow, HTTP auth, atomic confirm, standalone webhook, route auth bypass, reconcile, and SDK tests passed. |

## Final Standalone Readiness Decision

```text
NOT_READY_PROVIDER_RUNTIME_GAPS
```

Reason: boundary source purity is acceptable and Xendit sandbox foundations exist, but default Xendit runtime HTTP client/credential deployment wiring, schema extraction, operations worker readiness, and refund/cancel execution remain deferred. If all validation passes, this is a controlled provider-runtime foundation milestone, not full standalone extraction readiness.

## Next Recommended Phase

Phase 8I — Operations Layer + Worker Readiness:

1. Add explicit configured Xendit sandbox HTTP client policy.
2. Add stale pending expiration/reconciliation worker design and testable worker entry point.
3. Add standalone metrics/logging/error normalization.
4. Prepare SDK/API contract freeze inputs for Phase 8J.

## Guardrail Confirmations

- No AuraPoS SDK integration was implemented.
- Embedded `/api/payment-engine` runtime was not intentionally changed.
- Legacy order payment flow was not intentionally changed.
- No POS UI changes were made.
- No real provider refund/cancel money movement was implemented.
- No live Xendit network calls are required by tests.
