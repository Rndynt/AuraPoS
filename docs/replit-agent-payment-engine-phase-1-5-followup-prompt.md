# Replit Agent Prompt — Payment Engine Phase 1.5 Follow-up

Use this prompt in Replit Agent.

You are working in the AuraPoS repository.

This is a small follow-up after Payment Engine Phase 1.5 Hardening. Do not implement Phase 2 gateway work yet.

Read first:

- `docs/payment-engine-roadmap.md`
- `docs/reports/payment-engine-phase-1-5-hardening-report.md`
- `docs/replit-agent-payment-engine-phase-1-5-hardening-prompt.md`

Reviewed commit:

- `c4812a89317bb24689f585cbf8a188c18602527f`

## Do not change legacy order payment behavior

Do not intentionally change:

- `/api/orders/:id/payments`
- `/api/orders/create-and-pay`
- `packages/application/orders/RecordPayment.ts`
- `packages/application/orders/CreateAndPayOrder.ts`
- `apps/api/src/http/routes/orders.ts`
- `order_payments` legacy table behavior

## Do not implement future phases

Do not implement:

- real Midtrans/Xendit/Stripe integration
- gateway webhook processing
- order adapter integration
- POS UI changes
- split bill
- customer ledger
- stock reservation
- PPOB wallet or agent credit
- refund/void flow

## Main goal

Close the remaining Phase 1.5 review issues:

1. Make payment-engine smoke/manual testing possible after `requireCashier` was added.
2. Update smoke tests or document the correct authenticated test path.
3. Fix Phase 1.5 report inaccuracies and list all files changed.
4. Keep production auth secure.

---

## Task 1 — Decide and implement safe dev/test access for payment-engine API

Problem:
`/api/payment-engine` now uses `requireCashier`, which requires a Better Auth session. This is secure, but it can block smoke/manual API testing in Replit because `x-pos-role: cashier` is only honored after session + tenant match has already passed.

Required:
Choose one safe approach and implement it cleanly.

Preferred approach:
Add a dev/test-only service token guard for payment-engine routes.

Rules:

- Production must remain secure.
- Service token bypass must be disabled in production unless explicitly configured with a strong env var.
- Suggested env var: `PAYMENT_ENGINE_SERVICE_TOKEN`.
- Suggested header: `x-payment-engine-service-token`.
- If the token is configured and matches, allow the request as a payment operator after tenant context is resolved.
- If token is missing/wrong, fall back to `requireCashier`.
- Do not trust `x-pos-role` alone for payment engine production access.
- Document the exact behavior.

Alternative acceptable approach:
If you decide not to add a service token, update `smoke-test-pe.ts` and documentation to use a real Better Auth session. Explain clearly how to run it.

Acceptance:
- Payment-engine remains protected.
- Smoke/manual tests have a documented path.
- Production is not accidentally opened.

---

## Task 2 — Update or replace `smoke-test-pe.ts`

Current risk:
Existing smoke test may fail because payment-engine routes now require cashier auth/session.

Required:
- Update `apps/api/src/__tests__/smoke-test-pe.ts` or add a new payment-engine smoke test script.
- It must match the chosen access model from Task 1.
- If using service token, include header `x-payment-engine-service-token` and document required env var.
- If using Better Auth session, document setup/login steps.
- Keep existing DB-backed concurrency tests unchanged unless needed.

Acceptance:
- Smoke test instructions are executable and not misleading.
- The test must not rely on unauthenticated `x-pos-role` alone.

---

## Task 3 — Fix Phase 1.5 report accuracy

Problem 1:
The report does not mention all changed files from the Phase 1.5 commit. It missed non-payment files changed by the agent:

- `apps/api/src/__tests__/full-journey-registration.test.ts`
- `apps/api/src/scripts/fix-plan-tiers.ts`
- `packages/application/tenants/businessTypeTemplates.ts`

Required:
- Update `docs/reports/payment-engine-phase-1-5-hardening-report.md` to include these files under a separate section: `Scope Drift / Ancillary Type-Fix Changes`.
- Explain why they were changed.
- If any change is unrelated and not needed, revert it.
- Do not hide scope drift.

Problem 2:
The report describes `looksLikeUuidAttempt` as `value.includes('-') && !isValidUuid(value)`, but implementation uses `hyphenCount >= 2 && !isValidUuid(value)`.

Required:
- Update the report to match the implementation.
- Explain why `hyphenCount >= 2` is used: it avoids rejecting normal slugs like `demo-tenant`.

Acceptance:
- Report exactly matches code behavior.
- All changed files are listed.

---

## Task 4 — Add focused tests for the chosen dev/test access path

Add tests for whichever path you implement.

If service token is added:

- Missing token + no session returns 401.
- Valid service token + valid tenant context allows request through.
- Wrong token does not bypass auth.
- Production behavior is safe according to env rules.

If Better Auth session is required instead:

- Documented test helper creates or mocks a session correctly.
- Unauthenticated request remains 401.

Do not overbuild a full auth system.

---

## Task 5 — Create follow-up report

Create:

- `docs/reports/payment-engine-phase-1-5-followup-report.md`

Report must include:

- summary
- files changed
- chosen dev/test access model
- smoke test update
- report correction details
- tests added/updated
- commands run
- known limitations
- confirmation that legacy order payment flow was not intentionally changed
- confirmation that future phases were not implemented

## Commands to run

Run available checks:

- `npm run check`
- payment engine unit tests
- DB-backed payment engine concurrency tests
- updated smoke test command if practical

If any command fails, report the exact relevant error summary.

## Commit

Commit all changes with a clear message, for example:

`fix(payment-engine): add safe dev test access and correct phase 1.5 report`

Final Replit response must include:

- summary
- commit SHA
- files changed
- tests/checks run
- known issues
- confirmation that legacy order payment flow was not intentionally changed
