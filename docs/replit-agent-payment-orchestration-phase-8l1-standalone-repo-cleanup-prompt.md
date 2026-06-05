# Replit Agent Prompt — Payment Orchestration Phase 8L.1: Standalone Repo Cleanup Before AuraPoS Cleanup

Use this prompt in Replit Agent.

## Repositories

Source/reference repo:

- `https://github.com/Rndynt/AuraPoS.git`
- Latest extracted baseline reviewed in source: `18858bd405cadc5cb3aabfb526bd2bf0a9d31d24`

Target repo to fix:

- `https://github.com/Rndynt/northflow-payment-orchestration.git`
- Current standalone extraction commit reviewed: `42980b12a120596d3ca98bfb99ec440952e5ac7a`

## Goal

Clean up the standalone `northflow-payment-orchestration` repo so it is safe to use as the canonical standalone source before cleaning duplicate payment-orchestration code from AuraPoS.

This is a small but required cleanup phase after initial extraction.

Final decision must be one of:

- `STANDALONE_REPO_READY_FOR_AURAPOS_CLEANUP`
- `NOT_READY_MISSING_EXTRACTION_REPORT`
- `NOT_READY_PACKAGE_SCRIPT_BLOCKER`
- `NOT_READY_ENV_DOCS_BLOCKER`
- `NOT_READY_TEST_FAILURES`

## Guardrails

Do not implement app integration.

Do not modify AuraPoS runtime code.

Do not delete anything from AuraPoS in this phase.

Do not add provider features.

Do not add POS UI, order adapter, settlement, or production secret manager.

Work only in `northflow-payment-orchestration`, except if you need to read AuraPoS as reference.

## Task 1 — Add missing Phase 8L extraction report

Create in the standalone repo:

- `docs/reports/phase-8l-standalone-repo-extraction-report.md`

The report must include:

- summary
- source repo and source commit
- target repo and target commit
- extracted layout
- files copied/adapted
- package/config changes
- import/path cleanup result
- tests/checks run
- extraction-check result
- known limitations
- final decision
- next step: AuraPoS duplicate cleanup after this repo passes validation

The report must explicitly state whether the final decision is:

- `STANDALONE_REPO_READY_FOR_AURAPOS_CLEANUP`

or a blocker state.

## Task 2 — Fix root scripts

Update standalone root `package.json`.

Current root scripts include:

- `dev`
- `type-check`
- `test`
- `db:migrate`
- `db:generate`
- `worker`
- `extraction-check`

Add or fix:

- `check`: alias to `pnpm type-check`
- `build`: `turbo run build`
- `dev:service`: start service in dev mode
- `start:service`: start service in production-style mode

Suggested root scripts:

- `check`: `pnpm type-check`
- `build`: `turbo run build`
- `dev:service`: `pnpm --filter @northflow/payment-orchestration-service dev`
- `start:service`: `pnpm --filter @northflow/payment-orchestration-service start`

Update docs if commands differ.

## Task 3 — Add service start/build scripts

Update `apps/service/package.json`.

Add:

- `start`
- `build` if practical

Suggested:

- `start`: `NODE_ENV=production tsx --tsconfig tsconfig.json src/index.ts`
- `build`: `tsc -p tsconfig.json --noEmit`

If no transpile output is produced and runtime uses `tsx`, document that clearly.

## Task 4 — Clean env placeholders

Update both env examples if present:

- `.env.example`
- `apps/service/.env.example`

Replace placeholder that looks too much like a real key:

- from: `xnd_development_replace_with_real_key`
- to: `replace-with-xendit-sandbox-secret-key`

No `.env` file should be committed.

No real secret should appear anywhere.

## Task 5 — Clean standalone README wording

Update `README.md` so it does not present the standalone product as merely an AuraPoS child.

Allowed historical wording:

- mention extraction in a short migration/history section only.

Preferred opening description:

- `Northflow Payment Orchestration is a standalone payment orchestration service for merchant payment intents, provider accounts, webhook processing, reconciliation, worker operations, and typed SDK/API integration.`

Do not make the repo look AuraPoS-specific.

## Task 6 — Fix Docker docs if needed

Current Dockerfile is at:

- `apps/service/Dockerfile`

Make sure docs use the correct build context.

Because Dockerfile copies root workspace files, the build command should be documented from repo root using:

- `docker build -f apps/service/Dockerfile -t northflow-payment-orchestration .`

If README or deployment docs use `docker build -t northflow-payment-orchestration .`, correct them.

## Task 7 — Strengthen extraction check

Update `scripts/extraction-check.ts` if needed to verify:

- `docs/reports/phase-8l-standalone-repo-extraction-report.md` exists
- root `package.json` has `check`, `build`, `dev:service`, `start:service`
- service `package.json` has `start`
- env examples do not contain `xnd_development_replace_with_real_key`
- README does not open with AuraPoS-child wording
- Docker docs reference `-f apps/service/Dockerfile`

Keep existing checks for:

- forbidden AuraPoS imports
- no `shared/schema` references
- required packages
- required service files
- migrations
- OpenAPI docs
- no random assets/logs/build outputs

## Task 8 — Validation

Run in `northflow-payment-orchestration`:

- `pnpm install`
- `pnpm check`
- `pnpm build`
- `pnpm test`
- `pnpm extraction-check`
- `pnpm --filter @northflow/payment-orchestration-core type-check`
- `pnpm --filter @northflow/payment-orchestration-client-sdk type-check`
- `pnpm --filter @northflow/payment-orchestration-service type-check`

Do not fake results.

If any command fails, fix it or set final decision to a blocker state.

## Acceptance criteria

Accepted only if:

1. Phase 8L extraction report exists.
2. Root scripts include `check`, `build`, `dev:service`, `start:service`.
3. Service package includes `start`.
4. Env examples contain no real-looking Xendit placeholder.
5. README opens as standalone product, not as AuraPoS child.
6. Docker docs use correct `-f apps/service/Dockerfile` build command.
7. Extraction check validates these cleanup requirements.
8. Type-check, tests, and extraction-check pass or final decision is blocker.
9. No AuraPoS cleanup/deletion is performed in this phase.

## Commit and push

Commit in `northflow-payment-orchestration` with:

- `chore: finalize standalone extraction cleanup`

Push to:

- `https://github.com/Rndynt/northflow-payment-orchestration.git`

Do not commit to AuraPoS unless you are only adding a pointer/report there. Prefer no AuraPoS changes in this phase.

## Final response required

Final Replit response must include:

- target repo URL
- commit SHA in `northflow-payment-orchestration`
- files changed
- scripts added/fixed
- validation commands and results
- extraction-check result
- final decision
- confirmation that AuraPoS was not cleaned/deleted yet
- confirmation that no app integration was implemented
