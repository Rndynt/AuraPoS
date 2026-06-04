# Replit Agent Prompt — Payment Engine Phase 5 Reconciliation

Use this prompt in Replit Agent.

You are working in AuraPoS.

This is Phase 5 of the Payment Engine: reconciliation and stale recovery.

Read first:

- docs/payment-engine-roadmap.md
- docs/reports/payment-engine-phase-3-hardening-report.md
- docs/reports/payment-engine-phase-4-refund-void-report.md
- docs/reports/payment-engine-phase-4-hardening-report.md

Accepted base commit:

- 7896d14b12524125f4938c465fde32aa664a057a

## Guardrails

Do not intentionally change legacy order payment behavior:

- /api/orders/:id/payments
- /api/orders/create-and-pay
- packages/application/orders/RecordPayment.ts
- packages/application/orders/CreateAndPayOrder.ts
- apps/api/src/http/routes/orders.ts
- order_payments legacy table behavior

Do not implement future phases:

- no real gateway adapter
- no real provider credentials
- no order adapter
- no POS UI changes
- no split bill
- no customer ledger
- no stock reservation
- no PPOB wallet or credit
- no standalone extraction

## Goal

Add internal reconciliation tools for the Payment Engine.

The engine currently has manual payments, fake gateway transactions, webhook/event processing, refund, and void. Phase 5 should make the engine recoverable when something becomes stale or inconsistent.

Implement only internal recovery and audit tools.

## Required work

### 1. Stale provider event recovery

Add capability to find provider events stuck in `pending` for too long.

Create or update repository methods to list pending provider events older than a cutoff, optionally filtered by provider and limited by batch size.

Create use case:

- packages/application/payments/ReprocessStaleProviderEvents.ts

Rules:

- Support dry run.
- Dry run must not mutate anything.
- Actual run should process events one by one.
- One failed event must not abort the whole batch.
- Invalid-signature events must never mutate money movement.
- Unsupported provider should be reported safely.
- Events whose target transaction is already terminal should be ignored safely.
- Pending/requires_action transactions may be settled by reusing existing gateway settlement logic.
- Fresh pending events must not be selected.

### 2. Stale pending transaction detection

Create use case:

- packages/application/payments/ListStalePaymentTransactions.ts

Rules:

- List payment transactions with status `pending` or `requires_action` older than a cutoff.
- Support optional tenant and provider filters.
- Exclude succeeded, failed, cancelled, voided, and refunded transactions.
- Return enough data for admin/debugging: transaction id, intent id, provider, provider reference, amount, createdAt, and age.

Optional if practical:

- packages/application/payments/ExpireStalePaymentTransactions.ts

Rules:

- Must support dry run.
- Actual run may mark stale fake/internal pending transactions as `voided`.
- Do not call real provider APIs.
- Lock transaction rows before updating.

If expiration is too large, implement listing only and document expiration deferral.

### 3. Payment intent total reconciliation

Create use case:

- packages/application/payments/ReconcilePaymentIntentTotals.ts

Rules:

- Recompute expected amountPaid, amountRefunded, amountRemaining, and status from payment_transactions.
- Compare expected values against stored payment_intents values.
- Dry run returns mismatches only.
- Actual run locks each mismatched intent and fixes it using existing recalculation logic.
- Tenant isolation must be preserved.

### 4. Internal access path

Add either protected API endpoints under:

- /api/payment-engine/reconciliation

or scripts under:

- apps/api/src/scripts/payment-engine

Preferred endpoints:

- GET stale events
- POST reprocess stale events
- GET stale transactions
- POST expire stale transactions if implemented
- POST reconcile intents

Security:

- Do not expose publicly.
- Do not use provider webhook route for these operations.
- Use existing payment-engine operator guard at minimum.
- Prefer manager or owner guard if available.

### 5. Tests

Add tests for:

- stale provider event dry run;
- fresh provider event not selected;
- stale succeeded provider event can settle pending transaction;
- stale failed provider event does not increase amountPaid;
- terminal transaction event is ignored safely;
- invalid-signature stored event is not converted into money movement;
- unsupported provider does not abort the whole batch;
- stale pending transaction listing includes only old pending/requires_action rows;
- stale transaction listing excludes terminal rows;
- dry-run expiration mutates nothing if expiration is implemented;
- actual expiration voids stale fake/internal pending transaction if implemented;
- intent reconciliation dry run detects mismatch;
- intent reconciliation actual run fixes mismatch;
- tenant isolation is preserved;
- existing Phase 1 to Phase 4 tests still pass if practical.

### 6. Report

Create:

- docs/reports/payment-engine-phase-5-reconciliation-report.md

Report must include:

- summary;
- files changed;
- stale provider event recovery design;
- stale transaction detection or expiration design;
- payment intent reconciliation design;
- API endpoints or scripts added;
- security model;
- tests added or updated;
- commands run;
- known limitations;
- confirmation that legacy order payment flow was not intentionally changed;
- confirmation that future phases were not implemented.

## Commands

Run available checks:

- npm run check
- payment engine tests for phases 1 to 5 where practical
- DB-backed payment tests only if practical

If a command fails, report the relevant error summary.

## Commit

Commit with a clear message, for example:

feat(payment-engine): add reconciliation and stale recovery tools

Final Replit response must include summary, commit SHA, files changed, tests/checks run, known issues, and confirmation that legacy order payment flow was not intentionally changed.
