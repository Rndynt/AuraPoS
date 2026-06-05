# Codex Prompt — Payment Orchestration Phase 8J: Standalone Extraction Completion

Use this prompt in Codex.

You are working in the AuraPoS repository.

Current baseline:

- `9c5fee943aa437bf961355f55d41621b81e43632`

## Goal

Finish the remaining standalone extraction gaps inside this repository so Northflow Payment Orchestration is ready to be moved to its own standalone repo/package.

This phase is not API/SDK freeze yet and not app integration. It must close the extraction blockers that are still bridge/foundation-only.

Final decision must be one of:

- `READY_TO_EXTRACT_TO_STANDALONE_REPO`
- `NOT_READY_SCHEMA_OWNERSHIP_BLOCKER`
- `NOT_READY_EVENT_REPROCESS_BLOCKER`
- `NOT_READY_EXPIRY_WORKER_BLOCKER`
- `NOT_READY_EXTRACTION_SIMULATION_BLOCKER`
- `NOT_READY_TEST_FAILURES`

## Guardrails

Do not implement:

- AuraPoS SDK integration
- embedded `/api/payment-engine` route deletion
- legacy order payment migration
- POS UI changes
- order adapter migration
- Midtrans/Stripe provider
- platform settlement/payout
- production secret manager

Do not intentionally modify embedded payment runtime or legacy order flow:

- `apps/api/src/http/routes/payment-engine.ts`
- `packages/application/payments/*`
- `packages/domain/payments/*`
- `packages/infrastructure/payments/providers/*`
- `packages/application/orders/*`
- `apps/api/src/http/routes/orders.ts`
- `order_payments`

Allowed:

- standalone `apps/payment-orchestration-service/*`
- standalone `packages/payment-orchestration-core/*`
- standalone `packages/payment-orchestration-client-sdk/*` only if needed by contract changes
- standalone migrations/config/docs/tests/scripts
- root compatibility migrations only if needed for existing monorepo tests/database compatibility

## Read first

Read:

- `docs/reports/payment-orchestration-phase-8g8h-hardening-8i-runtime-readiness-report.md`
- `docs/reports/payment-orchestration-schema-extraction-plan.md`
- `docs/reports/payment-orchestration-phase-8g-boundary-audit.md`
- `docs/payment-orchestration-hybrid-standalone-architecture.md`
- `docs/payment-orchestration-service-smoke-test.md`
- `apps/payment-orchestration-service/src/infrastructure/schema.ts`
- `apps/payment-orchestration-service/src/application/use-cases/ReprocessProviderEvents.ts`
- `apps/payment-orchestration-service/src/application/use-cases/ExpireStalePaymentTransactions.ts`

## Task 1 — Replace schema bridge with standalone schema ownership

Current problem: service-local `schema.ts` still re-exports from `shared/schema.ts`.

Required:

1. Make `apps/payment-orchestration-service/src/infrastructure/schema.ts` the source of truth for all `payment_orchestration_*` Drizzle table definitions.
2. Repositories must continue importing from this service-local schema module.
3. Add standalone migration ownership under:
   - `apps/payment-orchestration-service/migrations/0001_payment_orchestration_initial.sql`
4. Add standalone Drizzle config if practical:
   - `apps/payment-orchestration-service/drizzle.config.ts`
5. Keep root/shared compatibility only if required by existing monorepo tests, but document it as compatibility, not ownership.
6. Add a test that verifies standalone repositories do not import payment tables directly from `shared/schema.ts`.
7. Add a report section proving direct shared-schema dependency is removed from service repositories.

If full table duplication causes Drizzle drift or test breakage, stop and report `NOT_READY_SCHEMA_OWNERSHIP_BLOCKER`; do not fake readiness.

## Task 2 — Add transaction expiry policy end-to-end

Current problem: stale expiration is mostly intent-expiry based.

Required:

1. Add transaction-level expiry support if missing:
   - DTO field `expiresAt: Date | null`
   - DB column `expires_at` for `payment_orchestration_transactions`
   - mapper support
   - repository create/update support
2. Provider result `expiresAt` must be saved into transaction rows.
3. Expiration policy:
   - transaction `expiresAt` is primary
   - provider raw `expires_at` may be parsed as fallback only if explicit and tested
   - intent `expiresAt` is fallback for intent-level expiration
4. `ExpireStalePaymentTransactions` must expire pending/requires_action transactions by transaction expiry, not only expired intents.
5. Recompute or update affected intent status safely after transactions expire.
6. Add root compatibility migration if needed for current monorepo DB:
   - `migrations/00xx_payment_orchestration_transaction_expires_at.sql`
7. Add tests for:
   - transaction expires even if intent is not expired
   - intent expires when its own expiresAt passes
   - terminal transactions are skipped
   - expiration is idempotent

## Task 3 — Store parsed webhook payload for reprocess

Current problem: provider event reprocess mostly safe-skips because parsed payload is unavailable.

Required:

1. Extend provider event reservation input to accept `parsedPayload`.
2. `HandleProviderWebhook` must store parsed payload after provider signature/token verification succeeds.
3. `DrizzlePaymentProviderEventRepository.reserveEvent()` must persist parsed payload.
4. Existing duplicate/idempotent event handling must remain safe.
5. Add tests proving parsedPayload is stored for FakeGateway and Xendit sandbox webhooks.

## Task 4 — Implement provider-specific event reprocess adapters

Current problem: `ReprocessProviderEvents` skips even when parsed payload exists.

Required:

1. Implement safe replay from previously verified stored `parsedPayload`.
2. Do not reverify signature during reprocess; only reprocess events that were already reserved after successful verification/parsing.
3. Add provider-specific reprocess support for:
   - `fake_gateway`
   - `xendit_sandbox`
4. Reprocess must use the same transaction/intent mutation rules as normal webhook handling.
5. Already processed events must not double-apply.
6. Reprocess summary must return counts:
   - processed
   - skipped
   - failed
7. Add tests for:
   - failed/pending event with parsedPayload can reprocess
   - processed event is skipped
   - missing parsedPayload is skipped
   - duplicate event does not double-credit amountPaid

If safe replay cannot be implemented without a large rewrite, implement adapter interface and mark `NOT_READY_EVENT_REPROCESS_BLOCKER` honestly.

## Task 5 — Make worker runner operational

Current worker files are callable, but this phase must make operations clearer for standalone use.

Required:

1. Add worker runner entry point:
   - `apps/payment-orchestration-service/src/workers/run.ts`
2. Supported operations:
   - `expire-stale`
   - `reconcile-intent`
   - `reprocess-provider-events`
   - `all-safe`
3. Runner must:
   - run without Express
   - output JSON summary
   - use safe exit codes
   - not require real provider network calls
4. Add npm/package script if practical for standalone service package.
5. Add tests for runner functions or direct operation dispatch.
6. Document example commands in smoke docs.

No cron scheduler required.

## Task 6 — Add extraction simulation check

Required:

1. Add script:
   - `scripts/payment-orchestration-extraction-check.ts`
2. It must check:
   - no forbidden imports from standalone source to embedded AuraPoS runtime
   - service repositories use service-local schema module
   - standalone migrations exist
   - worker entry points exist
   - ready endpoint exists
   - required package files exist for core, sdk, service
   - no random assets/logs/build outputs are part of the extraction set
3. Add npm script if practical:
   - `payment-orchestration:extraction-check`
4. Add test or run command in report.

## Task 7 — Documentation and final report

Create:

- `docs/reports/payment-orchestration-phase-8j-standalone-extraction-completion-report.md`

Update:

- `docs/payment-orchestration-hybrid-standalone-architecture.md`
- `docs/payment-orchestration-service-smoke-test.md`
- `PLANS.md`

Report must include:

- summary
- files changed
- schema ownership result
- transaction expiry result
- provider event parsedPayload/reprocess result
- worker runner result
- extraction simulation check result
- commands run table
- known limitations
- final decision
- next phase recommendation
- guardrail confirmations

Next phase after successful 8J should be:

- `8K — SDK/API Contract Freeze + Deployment Readiness`

Only if 8J final decision is `READY_TO_EXTRACT_TO_STANDALONE_REPO`.

## Commands to run

Run:

- `pnpm --filter @northflow/payment-orchestration-core type-check`
- `pnpm --filter @northflow/payment-orchestration-service type-check`
- `pnpm --filter @northflow/payment-orchestration-client-sdk type-check`
- `npm run check`
- all existing payment-orchestration tests
- all new tests added in this phase
- extraction check script if added

Do not fake results. If a command fails, fix it or report the exact blocker.

## Acceptance criteria

This phase is accepted only if:

1. Service-local schema is no longer just a re-export bridge.
2. Standalone migration ownership exists under the service.
3. Transaction expiry is modeled and tested end-to-end.
4. Webhook parsedPayload is persisted after verification/parsing.
5. Provider event reprocess can safely replay supported stored events or clearly fails readiness.
6. Worker runner is operational without Express.
7. Extraction check exists and passes or reports exact blockers.
8. Root check and package type-checks pass, or final decision is a blocker state.
9. No app integration was implemented.
10. No embedded payment runtime or legacy order flow was intentionally changed.

## Commit

If implementation succeeds:

- `feat(payment-orchestration): complete standalone extraction readiness gaps`

If blocked:

- `docs(payment-orchestration): document standalone extraction blockers`

Final Codex response must include:

- summary
- commit SHA
- files changed
- blockers fixed
- remaining blockers
- tests/checks run
- final decision
- next phase
- confirmation that no app integration was implemented
- confirmation that no embedded payment runtime was intentionally changed
- confirmation that no legacy order payment flow was intentionally changed
