# Replit Agent Prompt — Payment Orchestration Phase 8L: Extract to Standalone Repo

Use this prompt in Replit Agent.

## Source repo

Current repo:

- `https://github.com/Rndynt/AuraPoS.git`
- Baseline commit reviewed: `18858bd405cadc5cb3aabfb526bd2bf0a9d31d24`

## Target repo

Standalone repo:

- `https://github.com/Rndynt/northflow-payment-orchestration.git`

This repo is the target output for Phase 8L.

## Goal

Extract Northflow Payment Orchestration out of AuraPoS into the standalone repo.

This is not a design task. This is not an integration task. This is not a provider expansion task.

Final result must be a working standalone repository pushed to:

- `Rndynt/northflow-payment-orchestration`

Final decision must be one of:

- `STANDALONE_REPO_INITIALIZED_AND_VALIDATED`
- `NOT_READY_EXTRACTION_COPY_BLOCKER`
- `NOT_READY_IMPORT_BOUNDARY_BLOCKER`
- `NOT_READY_PACKAGE_CONFIG_BLOCKER`
- `NOT_READY_TEST_FAILURES`

## Hard rules

Do not implement app integration.

Do not add:

- AuraPoS integration
- Transity integration
- KiosKoin integration
- POS UI
- order adapter
- Midtrans provider
- Stripe provider
- platform settlement
- production secret manager

Do not modify embedded payment engine inside AuraPoS.

Do not delete payment orchestration from AuraPoS in this phase. AuraPoS remains the source/fallback repo. The output is a clean standalone target repo.

## Required standalone repo layout

Create this layout in `northflow-payment-orchestration`:

- `packages/core`
- `packages/client-sdk`
- `apps/service`
- `migrations`
- `docs`
- `scripts`
- `docker` if needed
- `.github/workflows` if practical
- `package.json`
- `pnpm-workspace.yaml`
- `tsconfig.base.json`
- `turbo.json`
- `README.md`
- `.gitignore`
- `.env.example` or `apps/service/.env.example`

## Copy from AuraPoS

Copy and adapt these source paths:

- `packages/payment-orchestration-core` → `packages/core`
- `packages/payment-orchestration-client-sdk` → `packages/client-sdk`
- `apps/payment-orchestration-service` → `apps/service`
- `apps/payment-orchestration-service/migrations/*` → `migrations/*`
- `docs/openapi/payment-orchestration.openapi.json` → `docs/openapi/payment-orchestration.openapi.json`
- `docs/payment-orchestration-api-contract.md`
- `docs/payment-orchestration-sdk-contract.md`
- `docs/payment-orchestration-error-codes.md`
- `docs/payment-orchestration-deployment.md`
- `docs/payment-orchestration-worker-operations.md`
- `docs/payment-orchestration-service-smoke-test.md`
- `docs/payment-orchestration-standalone-repo-layout.md`
- `scripts/payment-orchestration-extraction-check.ts` → `scripts/extraction-check.ts`

Also create a standalone `README.md` that explains:

- what Northflow Payment Orchestration is
- packages and service layout
- install
- type-check
- tests
- run service
- run workers
- run migrations
- use SDK
- direct API usage
- provider/runtime notes
- env setup
- extraction status

## Rename package paths

In the standalone repo, package names should be:

- `@northflow/payment-orchestration-core`
- `@northflow/payment-orchestration-client-sdk`
- `@northflow/payment-orchestration-service`

Internal imports must not use:

- `@pos/*`
- `apps/api/*`
- `shared/*`
- `packages/application/*`
- `packages/domain/*`
- `packages/infrastructure/*`
- any AuraPoS embedded payment route/provider path

Standalone service must import from:

- `@northflow/payment-orchestration-core`
- local service files under `apps/service/src/*`

## Package/config requirements

Root `package.json` must include scripts:

- `type-check`
- `check`
- `test`
- `build`
- `dev:service`
- `start:service`
- `worker`
- `db:migrate` or documented migration command
- `extraction-check`

Use pnpm workspaces.

`pnpm-workspace.yaml` must include:

- `packages/*`
- `apps/*`

`turbo.json` should run type-check/build/test if applicable.

Service package should include scripts for:

- `dev`
- `start`
- `type-check`
- `worker`
- `db:check` or migration check if practical

Core and SDK packages should include:

- `type-check`
- `build` if practical

## TypeScript/path cleanup

Create standalone TypeScript config.

Make imports compile without AuraPoS root aliases.

If tests need path aliases, define them in standalone repo config only.

No reference to AuraPoS root `shared/schema.ts` is allowed.

## Schema and migrations

The standalone source of truth must be:

- `apps/service/src/infrastructure/schema.ts`
- `migrations/0001_payment_orchestration_initial.sql`

Do not depend on AuraPoS `shared/schema.ts`.

Keep root `migrations` in the standalone repo only for payment orchestration.

## Tests

Move or recreate the relevant payment orchestration tests into the standalone repo.

Preferred structure:

- `tests/payment-orchestration-service-fakegateway-flow.test.ts`
- `tests/payment-orchestration-service-http-auth.test.ts`
- `tests/payment-orchestration-atomic-confirm.test.ts`
- `tests/payment-orchestration-standalone-webhook.test.ts`
- `tests/payment-orchestration-webhook-route-auth-bypass.test.ts`
- `tests/payment-orchestration-reconcile.test.ts`
- `tests/payment-orchestration-schema-mappers.test.ts`
- `tests/payment-orchestration-core-contract-adapter.test.ts`
- `tests/payment-orchestration-8k-contract-freeze.test.ts`
- `tests/payment-orchestration-expire-stale.test.ts`
- `tests/payment-orchestration-provider-event-reprocess.test.ts`
- `tests/payment-orchestration-schema-boundary.test.ts`

If moving every historical test is too much in one pass, move the core standalone acceptance tests first and document omitted tests as deferred. But do not claim full extraction if critical tests are missing.

## Extraction check

Update `scripts/extraction-check.ts` for the standalone repo.

It must check:

- no AuraPoS imports
- no `shared/schema.ts` references
- no embedded payment-engine references
- required packages exist
- required service files exist
- required migrations exist
- OpenAPI exists and valid JSON
- `.env.example` exists and contains no real secrets
- Dockerfile exists
- worker runner exists
- README exists
- no random assets/logs/build outputs

Add root script:

- `pnpm extraction-check`

## Docker/deployment

Keep or adapt:

- `apps/service/Dockerfile`

If Dockerfile cannot build from new repo layout, fix it.

Add deployment docs if missing:

- `docs/payment-orchestration-deployment.md`
- `docs/payment-orchestration-worker-operations.md`

Do not include real secrets.

## Documentation

Create or update in standalone repo:

- `README.md`
- `docs/openapi/payment-orchestration.openapi.json`
- `docs/payment-orchestration-api-contract.md`
- `docs/payment-orchestration-sdk-contract.md`
- `docs/payment-orchestration-error-codes.md`
- `docs/payment-orchestration-deployment.md`
- `docs/payment-orchestration-worker-operations.md`
- `docs/payment-orchestration-service-smoke-test.md`
- `docs/reports/phase-8l-standalone-repo-extraction-report.md`

The Phase 8L report must include:

- summary
- source repo/commit
- target repo
- files copied
- path/import changes
- package/config changes
- tests/checks run
- extraction check result
- known limitations
- final decision
- next phase recommendation

## Validation commands

Run in target standalone repo:

- `pnpm install`
- `pnpm type-check` or `pnpm check`
- `pnpm test` if test script exists
- `pnpm extraction-check`
- service package type-check
- core package type-check
- client-sdk package type-check

Do not fake results. If a command fails, fix it or set the final decision to a blocker state.

## Commit and push

Commit the standalone repo with message:

- `feat: initialize northflow payment orchestration standalone`

Push to:

- `https://github.com/Rndynt/northflow-payment-orchestration.git`

If you also update AuraPoS docs with an extraction pointer, commit that separately in AuraPoS. Do not delete source code from AuraPoS in this phase.

## Final response required

Final Replit response must include:

- target repo URL
- commit SHA in `northflow-payment-orchestration`
- files/layout created
- tests/checks run
- extraction check result
- final decision
- known limitations
- confirmation that no app integration was implemented
- confirmation that AuraPoS embedded payment runtime was not deleted or modified
