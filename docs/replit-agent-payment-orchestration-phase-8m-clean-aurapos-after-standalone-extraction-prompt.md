# Replit Agent Prompt — Payment Orchestration Phase 8M: Clean AuraPoS After Standalone Extraction

Use this prompt in Replit Agent.

## Repository

Work in:

- `https://github.com/Rndynt/AuraPoS.git`

Current accepted baseline:

- `ca9be4477e513ed8897f77114f008a9f10522af5`

Standalone payment repository is already up to date from the in-repo folder:

- `https://github.com/Rndynt/northflow-payment-orchestration.git`

## Goal

Clean AuraPoS by removing duplicated Northflow/payment-orchestration standalone artifacts that have already been extracted and pushed to the standalone payment repository.

AuraPoS should no longer carry the standalone payment-orchestration workspace, standalone packages, standalone service, standalone docs, standalone tests, and standalone prompts/reports.

This is a cleanup phase. Do not implement new payment features.

Final decision must be one of:

- `AURAPOS_PAYMENT_ORCHESTRATION_DUPLICATES_CLEANED`
- `NOT_READY_STANDALONE_REPO_NOT_CONFIRMED`
- `NOT_READY_AURAPOS_RUNTIME_BREAKAGE`
- `NOT_READY_IMPORT_REFERENCE_BLOCKER`
- `NOT_READY_TEST_FAILURES`

## Guardrails

Do not implement app integration.

Do not add SDK usage inside AuraPoS.

Do not add provider features.

Do not touch POS UI unless only removing dead links caused by deleted standalone docs.

Do not delete legacy AuraPoS runtime payment/order code unless it is proven unused and only belongs to the extracted standalone service.

Keep these AuraPoS runtime areas unless tests prove they are dead and removal is explicitly safe:

- `apps/api/src/http/routes/payment-engine.ts`
- `packages/application/payments/*`
- `packages/domain/payments/*`
- `packages/infrastructure/payments/providers/*`
- `packages/application/orders/*`
- `apps/api/src/http/routes/orders.ts`
- `shared/schema.ts`
- root migrations used by AuraPoS runtime

The goal is to remove extracted standalone duplicates, not to break the existing AuraPoS payment/order runtime.

## Must remove from AuraPoS

Delete the in-repo standalone extracted folder:

- `northflow-payment-orchestration/`

Delete standalone packages duplicated in AuraPoS:

- `packages/payment-orchestration-core/`
- `packages/payment-orchestration-client-sdk/`

Delete standalone service duplicated in AuraPoS:

- `apps/payment-orchestration-service/`

Delete standalone extraction/check script duplicated in AuraPoS:

- `scripts/payment-orchestration-extraction-check.ts`

Delete standalone payment-orchestration docs that now belong in the standalone repository:

- `docs/openapi/payment-orchestration.openapi.json`
- `docs/payment-orchestration-api-contract.md`
- `docs/payment-orchestration-sdk-contract.md`
- `docs/payment-orchestration-error-codes.md`
- `docs/payment-orchestration-deployment.md`
- `docs/payment-orchestration-worker-operations.md`
- `docs/payment-orchestration-service-smoke-test.md`
- `docs/payment-orchestration-standalone-repo-layout.md`
- `docs/payment-orchestration-standalone-fakegateway-smoke.md`
- `docs/payment-orchestration-hybrid-standalone-architecture.md`
- any `docs/replit-agent-payment-orchestration-phase-*` prompts related only to standalone extraction/runtime work
- standalone-only payment orchestration reports under `docs/reports/payment-orchestration-*`
- `docs/reports/phase-8l-standalone-repo-extraction-report.md`

Delete standalone-only tests copied for payment-orchestration service/package extraction if they are not required by existing AuraPoS runtime:

- `apps/api/src/__tests__/payment-orchestration-*.test.ts`

But do not delete tests that validate actual remaining AuraPoS runtime code unless they are updated or replaced safely.

## Required replacement docs inside AuraPoS

Create one lightweight pointer doc:

- `docs/northflow-payment-orchestration-externalized.md`

Content must state:

- Northflow Payment Orchestration has been extracted to `https://github.com/Rndynt/northflow-payment-orchestration`
- AuraPoS no longer owns standalone payment orchestration packages/service/docs/tests
- Future integration should call the standalone service via direct API or SDK after a separate integration phase
- Existing AuraPoS embedded/legacy payment runtime remains untouched in this cleanup phase

## Package/config cleanup

Update AuraPoS workspace/package configs if they reference removed standalone packages/apps.

Check and update if needed:

- root `package.json`
- `pnpm-workspace.yaml`
- `turbo.json`
- `tsconfig*.json`
- `replit.md`
- `PLANS.md`
- `.agents/memory/*` only if needed to prevent instructions from pointing to deleted paths

Remove references to:

- `@northflow/payment-orchestration-core` as a local workspace package if it points to removed package
- `@northflow/payment-orchestration-client-sdk` as a local workspace package if it points to removed package
- `@northflow/payment-orchestration-service` as a local workspace app if it points to removed app
- `apps/payment-orchestration-service`
- `packages/payment-orchestration-core`
- `packages/payment-orchestration-client-sdk`
- `northflow-payment-orchestration/`

If AuraPoS still needs those packages later, it must consume them from the standalone repo/package in a separate integration phase, not local workspace.

## Import/reference audit

After deletion, run searches to ensure no broken references remain in active AuraPoS source/config:

- `northflow-payment-orchestration/`
- `apps/payment-orchestration-service`
- `packages/payment-orchestration-core`
- `packages/payment-orchestration-client-sdk`
- `@northflow/payment-orchestration-core`
- `@northflow/payment-orchestration-client-sdk`
- `@northflow/payment-orchestration-service`
- `payment-orchestration-service`

It is acceptable for the pointer doc and final cleanup report to mention these paths historically.

It is not acceptable for active source/config/test files to import deleted local paths.

## Final cleanup report

Create:

- `docs/reports/payment-orchestration-phase-8m-aurapos-cleanup-report.md`

Report must include:

- summary
- standalone repo URL confirmed
- files/directories deleted
- files/configs updated
- remaining AuraPoS payment runtime intentionally kept
- import/reference audit result
- commands run
- test/check result
- known limitations
- final decision

## Validation commands

Run from AuraPoS root:

- `npm run check` if available
- `pnpm check` if available
- `pnpm type-check` if available
- relevant AuraPoS API tests if available
- at minimum run TypeScript check/build command used by this repo

Also run search/audit commands, for example:

- `grep -R "northflow-payment-orchestration" -n . --exclude-dir=.git --exclude-dir=node_modules`
- `grep -R "apps/payment-orchestration-service" -n . --exclude-dir=.git --exclude-dir=node_modules`
- `grep -R "packages/payment-orchestration-core" -n . --exclude-dir=.git --exclude-dir=node_modules`
- `grep -R "packages/payment-orchestration-client-sdk" -n . --exclude-dir=.git --exclude-dir=node_modules`
- `grep -R "@northflow/payment-orchestration" -n . --exclude-dir=.git --exclude-dir=node_modules`

Do not fake results. If a command fails, fix it or set final decision to a blocker state.

## Acceptance criteria

Accepted only if:

1. `northflow-payment-orchestration/` folder is removed from AuraPoS.
2. Standalone local packages are removed from AuraPoS:
   - `packages/payment-orchestration-core/`
   - `packages/payment-orchestration-client-sdk/`
3. Standalone local service is removed from AuraPoS:
   - `apps/payment-orchestration-service/`
4. Standalone-only docs/prompts/reports/tests/scripts are removed or replaced with a single pointer doc/report.
5. Active AuraPoS source/config no longer imports deleted local standalone packages/service paths.
6. Existing AuraPoS embedded/legacy payment/order runtime is not broken by deletion.
7. Check/type-check/test command is run and result documented.
8. Final decision is `AURAPOS_PAYMENT_ORCHESTRATION_DUPLICATES_CLEANED`, or a clear blocker state.

## Commit and push

Commit with:

- `chore(payment-orchestration): remove extracted standalone duplicates from aurapos`

Push to AuraPoS.

## Final response required

Final Replit response must include:

- commit SHA
- files/directories removed
- configs updated
- pointer doc created
- validation commands and results
- final decision
- confirmation that standalone repo remains the canonical Northflow Payment Orchestration source
- confirmation that existing AuraPoS embedded/legacy payment/order runtime was not intentionally deleted
