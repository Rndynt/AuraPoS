# Replit Agent Prompt — Migrate All Legacy AuraPoS Payment Features into Northflow Folder

Use this prompt in Replit Agent.

## Repository

Work in:

- `https://github.com/Rndynt/AuraPoS.git`

Current relevant baseline:

- `be1751fcf64782b674b14b075bf1499488eb405b`

Northflow target source folder inside AuraPoS:

- `northflow-payment-orchestration/`

Canonical standalone repo to sync after this work:

- `https://github.com/Rndynt/northflow-payment-orchestration.git`

## Goal

Before deleting payment from AuraPoS, migrate every useful legacy/embedded AuraPoS payment capability into `northflow-payment-orchestration/`.

This phase is a **legacy payment parity migration**, not a cleanup phase.

Do not delete AuraPoS payment code yet. First make the Northflow folder complete enough that AuraPoS payment can be removed safely after review.

Final decision must be one of:

- `NORTHFLOW_PAYMENT_PARITY_READY_FOR_AURAPOS_PAYMENT_REMOVAL`
- `NOT_READY_REFUND_VOID_PARITY_BLOCKER`
- `NOT_READY_PROVIDER_CONTRACT_PARITY_BLOCKER`
- `NOT_READY_MANUAL_PROVIDER_PARITY_BLOCKER`
- `NOT_READY_CONTROLLER_ROUTE_PARITY_BLOCKER`
- `NOT_READY_ROUTE_SDK_PARITY_BLOCKER`
- `NOT_READY_TEST_FAILURES`

## Non-negotiable parity items

These legacy items must be explicitly audited and either ported or explicitly documented as intentionally dropped with a technical reason:

1. `RefundPaymentTransaction`
2. `VoidPaymentTransaction`
3. provider-level `cancelPayment()` / `refundPayment()` contract parity
4. manual provider behavior
5. legacy `PaymentEngineController` / `payment-engine` route parity
6. FakeGateway provider behavior
7. Xendit provider behavior
8. provider capability/action descriptor behavior
9. idempotency, reconciliation, webhook, and transaction lifecycle behavior

Do not mark final ready if any critical item above is missing or only mentioned in docs without implementation.

## Legacy source files to inspect

Read and compare at minimum:

- `packages/application/payments/RefundPaymentTransaction.ts`
- `packages/application/payments/VoidPaymentTransaction.ts`
- `packages/application/payments/CreatePaymentIntent.ts`
- `packages/application/payments/CreateGatewayPayment.ts`
- `packages/application/payments/RecalculatePaymentIntent.ts`
- `packages/application/payments/ListPaymentTransactions.ts`
- `packages/application/payments/HandlePaymentProviderWebhook.ts`
- `packages/application/payments/index.ts`
- `packages/domain/payments/provider.ts`
- `packages/domain/payments/status.ts`
- `packages/domain/payments/*`
- `packages/infrastructure/payments/providers/FakeGatewayProvider.ts`
- `packages/infrastructure/payments/providers/XenditProvider.ts`
- `packages/infrastructure/repositories/payments/*`
- `apps/api/src/http/controllers/PaymentEngineController.ts`
- `apps/api/src/http/routes/payment-engine.ts`
- `apps/api/src/container.ts`
- `apps/api/src/__tests__/payment-engine.test.ts`
- `apps/api/src/__tests__/payment-engine-phase2.test.ts`
- `apps/api/src/__tests__/payment-engine-phase4.test.ts`
- `apps/api/src/__tests__/payment-provider-contract.test.ts`
- `apps/api/src/__tests__/payment-xendit-provider.test.ts`
- `apps/api/src/__tests__/payment-engine-fakegateway-e2e.test.ts`

## Hard guardrails

Do not delete payment from AuraPoS in this phase.

Do not modify the standalone remote repo directly until the folder is validated.

Do not implement AuraPoS integration with Northflow.

Do not add POS UI.

Do not add settlement/payout.

Do not add production secret manager.

Do not migrate unrelated AuraPoS order/product/inventory/customer modules.

Work primarily inside:

- `northflow-payment-orchestration/`

Legacy AuraPoS files may be read and used as reference only.

## Task 1 — Build complete legacy-to-Northflow parity matrix

Create:

- `northflow-payment-orchestration/docs/reports/legacy-payment-to-northflow-parity-matrix.md`

The matrix must compare legacy AuraPoS payment vs Northflow folder.

Rows must include at least:

- create payment intent
- create gateway payment
- list/get payment intent
- list/get transactions
- refundability calculation
- refund transaction execution
- void transaction execution
- recalculate/reconcile intent totals
- webhook verify/parse/process
- provider event idempotency
- idempotency key behavior
- FakeGateway create payment
- FakeGateway webhook
- FakeGateway refund/cancel behavior
- Xendit create payment
- Xendit webhook
- Xendit polling/status refresh
- Xendit refund/cancel behavior if legacy has it
- provider-level `cancelPayment()` contract
- provider-level `refundPayment()` contract
- provider capabilities
- provider action descriptors
- manual provider behavior
- PaymentEngineController behavior
- payment-engine route behavior
- HTTP response/error behavior
- SDK method coverage
- schema/migration coverage
- tests coverage

Each row must have:

- legacy source file(s)
- Northflow target file(s)
- status: `ported`, `ported_with_design_change`, `intentionally_dropped`, `missing`, or `blocked`
- notes

Critical rows cannot be `missing` or `blocked` if final decision is ready.

## Task 2 — Port RefundPaymentTransaction to Northflow

Implement an equivalent of legacy:

- `packages/application/payments/RefundPaymentTransaction.ts`

Target files:

- `northflow-payment-orchestration/apps/service/src/application/use-cases/RefundPaymentTransaction.ts`
- `northflow-payment-orchestration/packages/core/src/application/contracts.ts`
- `northflow-payment-orchestration/packages/core/src/application/repositories.ts`
- `northflow-payment-orchestration/apps/service/src/routes/transactions.ts` or equivalent route file
- `northflow-payment-orchestration/packages/client-sdk/src/client.ts`

Required API route:

- `POST /v1/payment-transactions/:transactionId/refund`

Required SDK method:

- `refundPaymentTransaction(transactionId, input)`

Behavior parity:

- amount must be greater than zero
- original transaction must exist for merchant
- original transaction must be `succeeded`
- original transaction must be incoming
- original transaction type must be refundable, e.g. payment/deposit/settlement if these types exist in Northflow
- compute already refunded amount from child refund transactions
- reject amount exceeding refundable remaining
- create outgoing refund transaction linked to parent transaction
- update/recalculate intent totals/status safely
- support idempotency key replay
- reject idempotency key conflict
- return refund transaction, updated intent, and refundable remaining

Design rule:

- Implement internal refund ledger behavior first.
- Do not fake real provider refund success for production providers.
- Provider refund call must be optional and capability-gated.
- FakeGateway may implement deterministic dev/test refund behavior.
- Xendit sandbox may report unsupported unless a safe sandbox refund implementation already exists.

## Task 3 — Port VoidPaymentTransaction to Northflow

Implement an equivalent of legacy:

- `packages/application/payments/VoidPaymentTransaction.ts`

Target files:

- `northflow-payment-orchestration/apps/service/src/application/use-cases/VoidPaymentTransaction.ts`
- `northflow-payment-orchestration/packages/core/src/application/contracts.ts`
- `northflow-payment-orchestration/packages/core/src/application/repositories.ts`
- `northflow-payment-orchestration/apps/service/src/routes/transactions.ts` or equivalent route file
- `northflow-payment-orchestration/packages/client-sdk/src/client.ts`

Required API route:

- `POST /v1/payment-transactions/:transactionId/void`

Required SDK method:

- `voidPaymentTransaction(transactionId, input)`

Behavior parity:

- transaction must exist for merchant
- allow void only for `pending` or `requires_action`
- reject succeeded transaction with message that it must be refunded, not voided
- reject failed/cancelled/refunded/terminal states
- already voided with same idempotency key returns success
- already voided with different/no idempotency key rejects
- set status to `voided` or canonical Northflow equivalent
- set `cancelledAt` or `voidedAt`; add field/migration if needed
- preserve/add metadata reason
- return updated transaction and intent

Preferred design:

- Support `voided` as a real transaction status because legacy uses it and previous payment docs mention void/refund.

## Task 4 — Provider-level cancel/refund contract parity

Update Northflow provider runtime contract:

- `northflow-payment-orchestration/apps/service/src/infrastructure/providers/StandalonePaymentProvider.ts`

Add optional methods:

- `cancelPayment?(input): Promise<StandaloneProviderCancelResult>`
- `refundPayment?(input): Promise<StandaloneProviderRefundResult>`

Add types:

- `StandaloneProviderCancelInput`
- `StandaloneProviderCancelResult`
- `StandaloneProviderRefundInput`
- `StandaloneProviderRefundResult`

Capability parity must include a clear equivalent of legacy:

- `canCancel`
- `canRefund`
- `supportsPartialRefund`
- `supportsMultiplePartialRefund`
- existing redirect/QR/VA/payment-code capabilities

Behavior rules:

- service must be able to determine support without calling provider
- unsupported cancel/refund returns stable public error codes
- use `PROVIDER_CANCEL_UNSUPPORTED` and `PROVIDER_REFUND_UNSUPPORTED`, or document the chosen stable names
- no production provider refund/cancel may be faked

## Task 5 — Manual provider behavior parity

Legacy `ManualProvider` behavior must be explicitly ported or explicitly replaced by a Northflow-native equivalent.

Target suggested file:

- `northflow-payment-orchestration/apps/service/src/infrastructure/providers/StandaloneManualProvider.ts`

Required behavior:

- provider code: `manual` or a documented Northflow equivalent
- create payment succeeds immediately
- no webhook support
- no polling support
- no external cancel API
- no external refund API
- capabilities must reflect immediate success and unsupported external gateway features
- manual payment should still create a transaction and update/recalculate intent correctly
- cancel/refund provider-level methods must return unsupported or be absent based on contract
- internal refund/void use cases must still work at ledger level where valid

If Northflow intentionally does not want a manual provider, create a documented equivalent policy in the parity matrix and docs, but final ready is only allowed if the same business behavior is covered by another supported provider/method.

Add tests for:

- manual payment immediate success
- manual provider capabilities
- manual provider refund/cancel unsupported at provider level
- internal refund of manual succeeded transaction if ledger policy allows it
- void rejection for already succeeded manual transaction

## Task 6 — Legacy PaymentEngineController / route parity

Read legacy:

- `apps/api/src/http/controllers/PaymentEngineController.ts`
- `apps/api/src/http/routes/payment-engine.ts`

Map every legacy endpoint/controller method to Northflow API routes.

Create report section in the parity matrix for controller/route mapping.

For each legacy route, classify as:

- `ported_to_new_route`
- `merged_into_new_route`
- `intentionally_dropped`
- `missing`

Northflow must have route/API coverage for critical payment actions:

- create intent
- create gateway payment
- list/get intent status
- list/get transactions if legacy supports it
- refundability
- refund transaction
- void transaction
- reconcile/recalculate
- webhook endpoints
- FakeGateway dev confirm/smoke endpoints where applicable
- provider status refresh/polling

Do not copy legacy route names blindly if Northflow already has cleaner REST routes. But document the mapping clearly.

Update:

- `northflow-payment-orchestration/docs/payment-orchestration-api-contract.md`
- `northflow-payment-orchestration/docs/openapi/payment-orchestration.openapi.json`
- `northflow-payment-orchestration/docs/payment-orchestration-service-smoke-test.md`

Add tests proving the new Northflow routes cover the legacy controller behavior for refund/void/provider paths.

## Task 7 — Add/adjust schema and migration for refund/void/manual parity

Audit:

- `northflow-payment-orchestration/apps/service/src/infrastructure/schema.ts`
- `northflow-payment-orchestration/migrations/*`

Ensure transaction rows can represent:

- parent transaction id
- direction incoming/outgoing
- transaction type refund/payment/deposit/settlement/manual if applicable
- refunded child transaction
- voided/cancelled status
- cancelledAt/voidedAt timestamp
- idempotency key
- refund/void reason through metadata
- provider reference for refund/cancel if provider returns one

If missing, add standalone migration:

- `northflow-payment-orchestration/migrations/0002_refund_void_manual_parity.sql`

Do not touch AuraPoS root migrations in this phase.

## Task 8 — Route, SDK, OpenAPI, and docs update

Add/update Northflow routes:

- `POST /v1/payment-transactions/:transactionId/refund`
- `POST /v1/payment-transactions/:transactionId/void`

Add/update SDK:

- `refundPaymentTransaction(transactionId, input)`
- `voidPaymentTransaction(transactionId, input)`

Update docs:

- `northflow-payment-orchestration/docs/openapi/payment-orchestration.openapi.json`
- `northflow-payment-orchestration/docs/payment-orchestration-api-contract.md`
- `northflow-payment-orchestration/docs/payment-orchestration-sdk-contract.md`
- `northflow-payment-orchestration/docs/payment-orchestration-error-codes.md`
- `northflow-payment-orchestration/docs/payment-orchestration-service-smoke-test.md`
- `northflow-payment-orchestration/README.md`

Error codes must include stable codes for:

- invalid refund amount
- refund amount exceeds refundable remaining
- invalid transaction status for refund
- invalid transaction status for void
- provider refund unsupported
- provider cancel unsupported
- idempotency conflict

## Task 9 — Port and strengthen parity tests

Use legacy tests as reference:

- `apps/api/src/__tests__/payment-engine-phase4.test.ts`
- `apps/api/src/__tests__/payment-provider-contract.test.ts`
- `apps/api/src/__tests__/payment-xendit-provider.test.ts`
- `apps/api/src/__tests__/payment-engine-fakegateway-e2e.test.ts`
- `apps/api/src/__tests__/payment-engine.test.ts`
- `apps/api/src/__tests__/payment-engine-phase2.test.ts`

Add/update tests in:

- `northflow-payment-orchestration/tests/`

Required coverage:

Refund:

- can refund succeeded incoming transaction
- rejects refund amount <= 0
- rejects refund of pending/requires_action/failed transaction
- rejects over-refund
- supports partial refund
- supports multiple partial refunds if contract allows
- idempotent replay with same key
- idempotency conflict with different transaction/key context
- updates/reconciles intent totals

Void:

- can void pending transaction
- can void requires_action transaction
- rejects succeeded transaction
- rejects failed/cancelled/refunded terminal transaction
- idempotent replay with same key
- rejects already voided without matching key
- preserves metadata/reason

Provider contract:

- provider capabilities expose cancel/refund support
- FakeGateway cancel/refund behavior deterministic
- Xendit sandbox unsupported behavior clear and stable if not implemented
- manual provider immediate success and unsupported provider-level refund/cancel

Controller/route/API/SDK:

- refund endpoint envelope success/error
- void endpoint envelope success/error
- SDK calls correct refund/void paths/methods/body/headers
- OpenAPI contains refund/void endpoints
- legacy controller/route mapping report has no critical missing rows

## Task 10 — Update extraction check

Update:

- `northflow-payment-orchestration/scripts/extraction-check.ts`

It must assert:

- refund use case exists
- void use case exists
- provider cancel/refund contract exists
- manual provider or equivalent documented policy exists
- OpenAPI contains refund and void endpoints
- SDK contains refund and void methods
- parity matrix exists
- final migration report exists
- no forbidden AuraPoS imports in Northflow source

## Task 11 — Final report

Create:

- `northflow-payment-orchestration/docs/reports/legacy-payment-parity-migration-report.md`

Report must include:

- summary
- legacy files audited
- features ported
- intentionally dropped features, if any
- refund parity result
- void parity result
- provider contract parity result
- manual provider parity result
- legacy controller/route parity result
- route/API/SDK parity result
- schema/migration changes
- tests added/updated
- validation commands and results
- final decision

## Validation commands

Run from inside the folder:

```bash
cd northflow-payment-orchestration
pnpm install
pnpm check
pnpm build
pnpm test
pnpm extraction-check
pnpm --filter @northflow/payment-orchestration-core type-check
pnpm --filter @northflow/payment-orchestration-client-sdk type-check
pnpm --filter @northflow/payment-orchestration-service type-check
```

If integration tests need database env and cannot run, run all non-DB unit/contract tests, document exact skipped DB tests, and do not claim full DB runtime validation.

Do not fake results.

## Acceptance criteria

Accepted only if:

1. Legacy parity matrix exists and has no critical `missing` or `blocked` rows.
2. Refund transaction execution exists in Northflow.
3. Void transaction execution exists in Northflow.
4. Provider runtime contract supports optional cancel/refund parity.
5. Manual provider behavior is ported or covered by a documented equivalent with tests.
6. Legacy PaymentEngineController/route behavior is mapped to Northflow routes with no critical missing actions.
7. FakeGateway and Xendit sandbox cancel/refund behavior are explicit.
8. API routes exist for refund and void.
9. SDK methods exist for refund and void.
10. OpenAPI/API/SDK docs include refund and void.
11. Tests cover refund/void/provider/manual/controller-route parity.
12. Extraction check validates refund/void/provider/manual/controller-route parity files/endpoints.
13. Final decision is `NORTHFLOW_PAYMENT_PARITY_READY_FOR_AURAPOS_PAYMENT_REMOVAL` or a clear blocker state.
14. No AuraPoS payment deletion occurs in this phase.

## Commit and push

Commit AuraPoS changes with:

- `feat(payment): port legacy payment parity into northflow folder`

Then push the updated `northflow-payment-orchestration/` folder contents to the standalone repo with:

- `feat: add legacy payment parity`

Do not run the full AuraPoS payment removal prompt until this parity migration is reviewed and accepted.

## Final response required

Final Replit response must include:

- AuraPoS commit SHA
- standalone repo commit SHA if pushed
- files changed inside `northflow-payment-orchestration/`
- parity matrix final status
- refund parity summary
- void parity summary
- provider cancel/refund parity summary
- manual provider parity summary
- legacy controller/route parity summary
- routes and SDK methods added
- tests/checks run
- final decision
- confirmation that AuraPoS payment code was not deleted yet
