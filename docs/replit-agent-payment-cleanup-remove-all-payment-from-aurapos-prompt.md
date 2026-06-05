# Replit Agent Prompt — Full AuraPoS Payment Removal After Northflow Extraction

Use this prompt in Replit Agent.

## Repository

Work in:

- `https://github.com/Rndynt/AuraPoS.git`

Current baseline after Northflow extraction/prompt work:

- `58befd3d93d9055541a44f0c3015f832530df4b5`

Canonical standalone payment repository:

- `https://github.com/Rndynt/northflow-payment-orchestration.git`

## Goal

Remove **all payment-related code, docs, tests, routes, packages, schemas, migrations, config references, and legacy payment engine/domain/provider code** from AuraPoS.

AuraPoS must no longer contain payment orchestration, payment engine, payment provider adapters, payment transactions/intents, payment docs/prompts/reports, or payment tests.

The standalone Northflow repository is now the canonical location for payment orchestration.

Final decision must be one of:

- `AURAPOS_PAYMENT_FULLY_REMOVED`
- `NOT_READY_PAYMENT_IMPORT_REFERENCES_REMAIN`
- `NOT_READY_SCHEMA_MIGRATION_BLOCKER`
- `NOT_READY_ORDER_PAYMENT_COUPLING_BLOCKER`
- `NOT_READY_TEST_FAILURES`

## Important context

AuraPoS is still in development. There is no production data migration requirement for this cleanup.

Prefer clean removal over backward compatibility.

If removing a payment field/table breaks code, remove or refactor the dependent code instead of preserving payment code.

Do not integrate AuraPoS with Northflow in this phase.

## Hard guardrails

Do not modify the standalone repo.

Do not add SDK/API calls to Northflow.

Do not create replacement payment logic in AuraPoS.

Do not leave placeholder payment stubs unless required to prevent broken references; if a stub is needed, it must return a clear `PAYMENT_REMOVED_FROM_AURAPOS` error and be documented as temporary. Prefer deleting routes entirely.

Do not remove unrelated POS modules such as products, inventory, tenants, outlets, orders, customers, reports, or auth unless the file is purely payment-specific.

## Delete standalone extraction duplicates

Remove:

- `northflow-payment-orchestration/`
- `packages/payment-orchestration-core/`
- `packages/payment-orchestration-client-sdk/`
- `apps/payment-orchestration-service/`
- `scripts/payment-orchestration-extraction-check.ts`

## Delete legacy/embedded payment engine and domain code

Remove payment-only backend route files, use cases, domain, infrastructure, providers, adapters, and tests.

Delete if present:

- `apps/api/src/http/routes/payment-engine.ts`
- any `apps/api/src/http/routes/*payment*.ts`
- `packages/application/payments/`
- `packages/domain/payments/`
- `packages/infrastructure/payments/`
- `packages/infrastructure/payments/providers/`
- `packages/application/payments/adapters/`
- `packages/domain/payments/*`
- `packages/domain/payment*`
- `packages/application/payment*`
- `packages/infrastructure/payment*`

Also remove imports/registrations of payment routes from server/app/router bootstrap files.

Search and remove all active imports/references to:

- `payment-engine`
- `paymentEngine`
- `PaymentEngine`
- `payment-orchestration`
- `PaymentOrchestration`
- `payment intent`
- `PaymentIntent`
- `payment transaction`
- `PaymentTransaction`
- `payment provider`
- `PaymentProvider`
- `PaymentMerchant`
- `PaymentProviderAccount`
- `PaymentProviderEvent`
- `IdempotencyKey` if payment-specific
- `FakeGateway`
- `Midtrans`
- `Xendit` if only used for payment
- `@northflow/payment-orchestration-*`

## Remove payment tests

Remove payment-only tests:

- `apps/api/src/__tests__/payment-orchestration-*.test.ts`
- `apps/api/src/__tests__/*payment*.test.ts`
- tests that only cover payment engine/provider/intents/transactions/webhooks/reconciliation/refundability

If an order test only contains a payment assertion, remove the payment assertion and keep the order test.

## Remove payment docs/prompts/reports

Remove payment-only docs from AuraPoS:

- `docs/openapi/payment-orchestration.openapi.json`
- `docs/payment-orchestration-*.md`
- `docs/northflow-payment-orchestration-externalized.md` if created by previous cleanup prompt
- `docs/replit-agent-payment-orchestration-*.md`
- `docs/replit-agent-payment-cleanup-*.md` after this phase is complete if not needed
- `docs/reports/payment-orchestration-*.md`
- `docs/reports/phase-8*-payment*.md`
- `docs/reports/phase-8l-standalone-repo-extraction-report.md`

Keep only one final cleanup report:

- `docs/reports/payment-removal-from-aurapos-final-report.md`

## Remove package/config references

Update all workspace/config files to remove payment packages/apps/scripts.

Check and update:

- root `package.json`
- `pnpm-workspace.yaml`
- `turbo.json`
- `tsconfig*.json`
- `vite.config*`
- `replit.md`
- `PLANS.md`
- `.agents/memory/*` only if they reference deleted payment paths and would mislead future agents
- any build/test script that points to payment files

Remove local workspace references to:

- `@northflow/payment-orchestration-core`
- `@northflow/payment-orchestration-client-sdk`
- `@northflow/payment-orchestration-service`
- `apps/payment-orchestration-service`
- `packages/payment-orchestration-core`
- `packages/payment-orchestration-client-sdk`
- `northflow-payment-orchestration`

## Remove schema/table definitions and migration references

AuraPoS should no longer define payment tables.

Update `shared/schema.ts` and related schema exports to remove payment-only tables/types/relations if present, including but not limited to:

- `payment_orchestration_*`
- `paymentIntents`
- `paymentTransactions`
- `paymentProviderAccounts`
- `paymentMerchants`
- `paymentProviderEvents`
- `paymentIdempotencyKeys`
- `orderPayments`
- `payments`
- `paymentMethods`
- `refunds` if payment-only
- `paymentStatus` fields if used only for payment engine
- payment-specific enums/statuses

If order schema has payment-specific fields, remove them if not needed for non-payment order operation:

- `paymentStatus`
- `paidAt`
- `amountPaid`
- `paymentMethod`
- `paymentReference`
- `paymentIntentId`
- `paymentTransactionId`

If removing columns requires a migration, create a dev cleanup migration such as:

- `migrations/00xx_remove_payment_from_aurapos.sql`

Since the project is in development, this migration may drop payment tables/columns cleanly.

Do not drop order tables, tenant tables, product tables, inventory tables, customer tables, or outlet tables.

## Remove API surface

Remove all payment endpoints from AuraPoS API.

Examples to remove:

- `/api/payment-engine/*`
- `/api/payments/*`
- `/api/payment-intents/*`
- `/api/payment-transactions/*`
- `/api/webhooks/payment*`
- `/api/webhooks/xendit*`
- `/api/webhooks/midtrans*`
- `/api/webhooks/fake_gateway*`

Remove route registration from app/server/router files.

If frontend calls those routes, remove the frontend payment UI/actions or replace with non-payment order status behavior.

## Remove frontend payment UI/hooks if present

Search and remove or refactor payment-specific UI and client code:

- payment pages
- payment dialogs
- refund UI
- payment method selector
- split payment UI
- gateway payment buttons
- payment intent status panels
- payment API clients/hooks
- payment types

Do not remove unrelated order/cart/checkout UI unless it is entirely payment-specific.

If checkout/order completion currently depends on payment, refactor it to create/complete order without payment handling for now.

## Audit commands

After cleanup, run searches and ensure no active payment code remains.

Use commands similar to:

```bash
grep -R "payment-orchestration" -n . --exclude-dir=.git --exclude-dir=node_modules || true
grep -R "payment-engine" -n . --exclude-dir=.git --exclude-dir=node_modules || true
grep -R "PaymentIntent" -n . --exclude-dir=.git --exclude-dir=node_modules || true
grep -R "PaymentTransaction" -n . --exclude-dir=.git --exclude-dir=node_modules || true
grep -R "PaymentProvider" -n . --exclude-dir=.git --exclude-dir=node_modules || true
grep -R "FakeGateway" -n . --exclude-dir=.git --exclude-dir=node_modules || true
grep -R "Midtrans" -n . --exclude-dir=.git --exclude-dir=node_modules || true
grep -R "Xendit" -n . --exclude-dir=.git --exclude-dir=node_modules || true
grep -R "@northflow/payment-orchestration" -n . --exclude-dir=.git --exclude-dir=node_modules || true
grep -R "orderPayments" -n . --exclude-dir=.git --exclude-dir=node_modules || true
grep -R "paymentStatus" -n . --exclude-dir=.git --exclude-dir=node_modules || true
```

It is acceptable for the final report to mention removed payment terms.

It is not acceptable for active source/config/test files to import or depend on removed payment code.

## Validation commands

Run the project’s normal validation commands.

Prefer:

```bash
npm run check
```

Also run any relevant app/API type-check/build/test commands available in the repo.

Do not fake command results. If checks fail, fix the broken imports/types or set final decision to blocker.

## Final report

Create:

- `docs/reports/payment-removal-from-aurapos-final-report.md`

Report must include:

- summary
- standalone payment repo URL
- directories/files removed
- schema/tables/columns removed
- migrations added/removed
- routes removed
- frontend/client references removed
- config/package changes
- audit search result
- validation commands and results
- known limitations
- final decision

## Acceptance criteria

Accepted only if:

1. `northflow-payment-orchestration/` is removed from AuraPoS.
2. `apps/payment-orchestration-service/` is removed from AuraPoS.
3. `packages/payment-orchestration-core/` is removed from AuraPoS.
4. `packages/payment-orchestration-client-sdk/` is removed from AuraPoS.
5. Legacy payment engine/domain/provider directories are removed from AuraPoS.
6. Payment routes are removed from API registration.
7. Payment-only tests/docs/prompts/reports/scripts are removed.
8. Payment-only schema tables/types/relations are removed from `shared/schema.ts` or documented as a blocker.
9. Active source/config has no imports to removed payment code.
10. Normal checks pass or final decision is blocker.
11. Final decision is `AURAPOS_PAYMENT_FULLY_REMOVED`, or a clear blocker state.

## Commit and push

Commit with:

- `chore(payment): remove payment runtime from aurapos`

Push to AuraPoS.

## Final response required

Final Replit response must include:

- commit SHA
- major directories/files removed
- schema/migration changes
- route/API changes
- config changes
- audit commands and results
- validation commands and results
- final decision
- confirmation that standalone Northflow repo is now the canonical payment source
