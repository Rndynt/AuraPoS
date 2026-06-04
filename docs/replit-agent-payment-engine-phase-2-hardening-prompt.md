# Replit Agent Prompt — Payment Engine Phase 2 Hardening

Use this prompt in Replit Agent.

You are working in the AuraPoS repository.

This is **Payment Engine Phase 2 Hardening**. Do not implement Phase 3 webhook work yet.

Read first:

- `docs/payment-engine-roadmap.md`
- `docs/reports/payment-engine-phase-2-gateway-abstraction-report.md`
- `docs/replit-agent-payment-engine-phase-2-gateway-abstraction-prompt.md`

Reviewed Phase 2 commit:

- `17ac19d406fb964a10280eda4655e6af35197959`

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
- production webhook processing
- `/api/payment-engine/webhooks/:provider`
- order adapter integration
- POS UI changes
- split bill
- customer ledger
- stock reservation
- PPOB wallet or agent credit
- refund/void flow

## Main goal

Harden Phase 2 before Phase 3. Fix:

1. Gateway idempotency replay after the intent is already paid.
2. Concurrent fake gateway confirmation double-allocation risk.
3. Fake confirm production guard ordering / documentation mismatch.
4. Phase 2 report test-count mismatch.
5. Add focused tests and report.

---

## Task 1 — Fix CreateGatewayPayment idempotency replay after paid intent

Current problem:
`CreateGatewayPayment` calls `assertIntentAcceptsPayment(intentDomain)` before checking idempotency. This breaks normal retry behavior.

Scenario that must work:

1. Client creates gateway payment with idempotency key A.
2. Pending transaction is created.
3. Fake confirmation marks it succeeded and intent becomes paid.
4. Client retries create gateway payment with same idempotency key A.
5. Engine must return idempotent replay of the existing transaction, even though the intent is now paid.

Required behavior:

- Lock intent row with `FOR UPDATE`.
- Check idempotency key before terminal-state validation.
- If same tenant + same idempotency key + same intent exists, return existing transaction and current intent.
- If same key belongs to another intent, throw `IDEMPOTENCY_KEY_CONFLICT`.
- Only run `assertIntentAcceptsPayment` when there is no idempotency replay and a new gateway transaction will be created.

Acceptance tests:

- Replay pending transaction before confirmation still works.
- Replay same idempotency key after confirmation/paid intent still works.
- Same idempotency key on different intent still returns conflict.
- New gateway payment on already-paid intent without idempotency replay is still rejected.

---

## Task 2 — Make ConfirmFakeGatewayPayment concurrency-safe

Current problem:
`ConfirmFakeGatewayPayment` finds transaction by provider reference, checks pending status, then locks the intent. It does not lock the transaction row or atomically transition pending → succeeded/failed.

Risk:
Two concurrent fake confirmations can both see the transaction as pending and create duplicate allocations.

Required fix:
Use one of these approaches:

Preferred approach A:

- Add repository method:
  - `lockByProviderReferenceForUpdate(provider, providerReference, tenantId, tx)`
- It must lock the transaction row with `FOR UPDATE` before checking status.
- Then lock the related intent row.
- Then update transaction, create allocation, recalculate intent.

Alternative approach B:

- Add atomic transition method:
  - `transitionPendingByProviderReference(provider, providerReference, tenantId, nextStatus, data, tx)`
- It must update only when current status is `pending` or `requires_action` and return no row if already terminal.
- If no row is returned, throw `INVALID_TRANSITION` or replay safely according to design.

Acceptance:

- Concurrent duplicate confirm succeeded cannot create duplicate allocation.
- A second confirm after success returns `INVALID_TRANSITION` or a safe idempotent result, but must not create another allocation.
- Failed confirmation creates no allocation.
- Succeeded confirmation creates exactly one allocation.

Recommended DB constraint:
If practical, add a migration or schema-level unique index to prevent duplicate default allocation for a transaction target:

- unique on `payment_transaction_id`, `target_type`, `target_id`

If adding the constraint is risky, do not force it, but document why and cover behavior with locking tests.

---

## Task 3 — Fix fake confirm production guard order or report

Current mismatch:
Report says `/fake-gateway/confirm` returns 404 in production before handler runs. But route-level `router.use(requirePaymentOperator)` runs before the inline production guard, so unauthenticated production requests may return 401 before 404.

Required:
Choose one design and make code/report consistent.

Preferred design:
- Make fake confirm route truly return 404 in production before auth/session guard.
- Achieve this by applying the production guard before `requirePaymentOperator` for this route, or by restructuring route middleware order cleanly.
- Keep all non-production fake confirm requests protected by `requirePaymentOperator`.

Alternative acceptable design:
- Keep current auth-first behavior, but update report and comments to say production returns 404 only after auth passes, while unauthenticated production callers may receive 401.

Preferred acceptance:
- In production, `POST /api/payment-engine/fake-gateway/confirm` returns 404 even without session/token.
- In non-production, it requires payment operator authorization.
- Tests cover production 404 behavior.

---

## Task 4 — Correct Phase 2 report test count

Current problem:
Phase 2 report summary says 42 tests, but the detailed test table says 38.

Required:
- Correct `docs/reports/payment-engine-phase-2-gateway-abstraction-report.md` so counts match actual tests.
- If tests are added in this hardening phase, create a new hardening report instead of rewriting history silently.

Create new report:

- `docs/reports/payment-engine-phase-2-hardening-report.md`

Report must include:

- summary
- files changed
- idempotency replay fix
- confirm concurrency fix
- fake confirm production guard behavior
- report corrections
- tests added/updated
- commands run
- known limitations
- confirmation that legacy order payment flow was not intentionally changed
- confirmation that Phase 3+ features were not implemented

---

## Task 5 — Tests

Add or update tests for:

1. `CreateGatewayPayment` idempotency replay after paid intent.
2. `CreateGatewayPayment` rejects new payment on paid intent when no idempotency replay exists.
3. Same idempotency key on different intent still conflicts.
4. `ConfirmFakeGatewayPayment` duplicate success confirmation does not create duplicate allocation.
5. Concurrent duplicate confirmation if practical.
6. Failed fake confirmation creates no allocation and does not change amountPaid.
7. Fake confirm route production behavior matches chosen design.
8. Existing Phase 1 manual payment tests still pass.
9. Existing Phase 2 gateway tests still pass.

Prefer DB-backed test for duplicate confirmation if practical. If not practical, use strong fake repository tests and document the limitation clearly.

---

## Commands to run

Run available checks:

- `npm run check`
- Phase 1 payment engine tests
- Phase 2 payment engine tests
- DB-backed payment tests if available

If a command fails, report exact relevant error summary.

## Commit

Commit all changes with a clear message, for example:

`fix(payment-engine): harden gateway idempotency and fake confirmation`

Final Replit response must include:

- summary
- commit SHA
- files changed
- tests/checks run
- known issues
- confirmation that legacy order payment flow was not intentionally changed
