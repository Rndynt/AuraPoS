# Replit/Codex Prompt P9 — POS Payment Usability Completion

Repository: `Rndynt/AuraPoS`

## Goal

Finish the real cashier payment usability flow for AuraPoS.

Stop extending the permission/RBAC track. P8 through P8.3 is enough for backend guard hardening for now. P9 must focus on the actual POS payment experience used by cashiers.

The current problem: multi payment and split bill are not useful yet. Some payment clicks can settle the order immediately as full payment, so DP/multi/split flows are not behaving as independent payment workflows.

P9 must make POS payment flows clear, usable, and safe.

## Core payment model

AuraPoS has built-in payment methods:

```txt
- Cash / Tunai
- Manual bank transfer
- Manual QRIS
```

These are payment methods, not payment flow modes.

AuraPoS has the built-in payment flow:

```txt
- Full payment
```

Full payment is core POS behavior and must always be available for checkout-capable tenants.

AuraPoS has optional independent payment flow modes controlled by entitlements/add-ons:

```txt
- DP / partial payment        -> payments_partial_payment
- Multi payment               -> payments_multi_payment
- Split payment bill          -> payments_split_bill or current SOT alias payments_split_payment
```

These three are independent features. Do not couple them to each other.

## Required concept separation

Do not mix these concepts:

```txt
Payment method = how money is paid
  Cash
  Manual bank transfer
  Manual QRIS

Payment flow mode = how the order is settled
  Full payment
  DP / partial payment
  Multi payment
  Split bill payment
```

Examples:

```txt
Full payment with Cash
Full payment with Manual QRIS
DP with Cash
DP with Manual Bank Transfer
Multi payment using Cash + Manual QRIS
Split bill where each split can be paid with Cash / Manual QRIS / Manual Transfer
```

## Read first

```txt
roadmap/business-flows/P0_current_pos_flow_audit.md
roadmap/business-flows/P2_pos_lifecycle_runtime_fix_report.md
roadmap/business-flows/P2_1_lifecycle_hardening_patch_report.md
roadmap/business-flows/P5_1_business_type_entitlement_model_correction_report.md
roadmap/business-flows/P6_food_beverage_service_core_flows_report.md
roadmap/business-flows/P6_1_cashier_ui_cleanup_report.md
roadmap/business-flows/P8_backend_action_policy_guard_report.md
roadmap/business-flows/P8_1_api_direct_bypass_tests_rbac_report.md
apps/pos-terminal-web/src/features/pos-core/**
apps/pos-terminal-web/src/features/pos-flows/**
apps/pos-terminal-web/src/features/pos/**
apps/api/src/http/controllers/OrdersController.ts
packages/application/orders/**
packages/application/business-flows/**
packages/application/entitlements/**
```

Search current payment code:

```bash
rg -n "Full payment|full payment|partial|DP|down payment|multi payment|multiPayment|split bill|splitBill|split payment|payments_partial|payments_multi|payments_split|recordPayment|RecordPayment|PaymentDialog|payment method|manual qris|qris|transfer|cash|tunai|paidAmount|remaining|remaining_amount|amountTendered" apps packages shared
```

## Scope

Allowed:

```txt
- Refactor POS payment dialog UX and state so modes are clear.
- Fix full payment, DP/partial, multi payment, and split bill flows.
- Add entitlement gating for optional modes.
- Add payment method selection for Cash, Manual Transfer, Manual QRIS.
- Fix calculation of paid/remaining/change.
- Prevent accidental full settlement when user selected DP/Multi/Split.
- Add tests for payment flow behavior.
- Update reports/roadmap/PLANS.
```

Forbidden:

```txt
- Do not continue P8.4 permission work.
- Do not build persisted permission claims.
- Do not rewrite NorthFlow.
- Do not replace built-in manual POS payment methods with external gateway-only flow.
- Do not require orders_queue for full payment.
- Do not make DP/Multi/Split depend on each other.
- Do not hardcode plan names.
- Do not map business type back to paid workflow profiles.
- Do not reintroduce GenericPOSPage or old frontend shims.
```

## Required payment UX design

### 1. Payment entry point

When cashier clicks Pay/Bayar, show a clear payment mode choice:

```txt
Full payment       Always available
DP / Partial       Show only if payments_partial_payment entitlement active, otherwise hidden/locked based on existing marketplace UX
Multi payment      Show only if payments_multi_payment entitlement active
Split bill         Show only if payments_split_bill / payments_split_payment entitlement active and order context supports split
```

Default selected mode should be Full payment.

### 2. Payment method selector

For every payable payment entry, method must be selected from built-in manual methods:

```txt
Cash / Tunai
Manual Bank Transfer
Manual QRIS
```

Cash supports amount tendered and change.

Manual transfer and manual QRIS should record exact amount paid, reference/note if current model supports it, and no change calculation.

Do not expose raw provider/payment-orchestration details in POS cashier UI.

## Full payment requirements

Full payment is core.

Behavior:

```txt
- amount due defaults to remaining total.
- method is Cash/Manual Transfer/Manual QRIS.
- successful payment marks order paid/completed according to current backend flow.
- cart clears only after success.
- receipt is available after success.
- no orders_queue entitlement required.
```

Tests:

```txt
- full payment with cash settles full amount.
- full payment with manual QRIS settles full amount.
- full payment with manual transfer settles full amount.
- full payment remains available with no optional entitlements.
- full payment does not require orders_queue.
```

## DP / partial payment requirements

DP is optional and independent.

Entitlement:

```txt
payments_partial_payment
```

Behavior:

```txt
- must not auto-settle full order unless paid amount >= remaining and user confirms final settlement.
- cashier enters DP amount.
- paid amount must be > 0 and < remaining for true DP.
- order remains partially paid / unpaid active according to current lifecycle model.
- UI displays paid amount and remaining amount after DP.
- continuing payment later should pay remaining, not recreate duplicate order.
- receipt/payment proof should reflect partial payment if current receipt model supports it.
```

Guardrails:

```txt
- no accidental full paid status when DP amount < remaining.
- no cart clear as if order is fully complete unless current lifecycle expects active order after DP.
- if backend only supports `recordPayment`, use it correctly with partial amount and status mapping.
```

Tests:

```txt
- DP without entitlement hidden or rejected safely.
- DP with entitlement records partial amount.
- remaining amount is correct.
- order is not marked fully paid when DP < total.
- later full remaining payment completes order.
```

## Multi payment requirements

Multi payment is optional and independent.

Entitlement:

```txt
payments_multi_payment
```

Behavior:

```txt
- cashier can add multiple payment lines for the same order/payment session.
- each line has method: Cash / Manual Transfer / Manual QRIS.
- each line has amount.
- sum of payment lines must equal remaining amount for final full settlement.
- if sum is less than remaining, require either partial entitlement or block with clear message.
- if sum exceeds remaining, allow only cash overpay/change rules where safe; otherwise block.
- submit records the correct total and method breakdown if backend supports breakdown; if backend does not support breakdown yet, document limitation and store safe metadata/note if available.
- must not instantly mark paid when first line is clicked unless total lines cover remaining and user confirms submit.
```

Tests:

```txt
- multi without entitlement hidden or rejected safely.
- multi with cash + QRIS exact total completes payment.
- multi with line sum less than total does not complete unless partial flow is explicitly supported.
- multi overpay rules are correct.
- first line click does not auto-settle order.
```

## Split bill requirements

Split bill is optional and independent.

Entitlement:

```txt
payments_split_bill or current SOT alias payments_split_payment
```

Behavior:

```txt
- split bill should not be just a button that immediately pays full order.
- split bill must create a split context before payment.
- supported split types for P9:
  1. split by amount, or
  2. split by item if current cart/order item model supports it safely.
- each split has amount due and paid status.
- cashier can pay one split at a time using Cash / Manual Transfer / Manual QRIS.
- original order should only be fully paid/completed when all splits are paid.
- if backend lacks persistent split bill model, implement only a safe UI/session model and document limitation; do not fake completed backend state incorrectly.
```

Minimum acceptable P9 split behavior:

```txt
- Split bill opens a real split setup screen/dialog.
- Cashier can create split lines by amount.
- Paying a split records only that split amount or stores safe pending split state.
- It must not immediately settle the whole order unless all split amounts are paid and confirmed.
```

Tests:

```txt
- split without entitlement hidden or rejected safely.
- split opens setup instead of immediate full payment.
- split by amount creates correct split totals.
- paying one split does not mark entire order paid unless all splits paid.
- all splits paid completes order.
```

## Payment state model / calculations

Centralize calculation helpers if they are currently duplicated:

```txt
totalAmount
paidAmount
remainingAmount
paymentLineTotal
changeAmount
isFullyPaid
isPartiallyPaid
```

Rules:

```txt
remaining = max(total - paid, 0)
change applies to cash overpay only
manual transfer/qris should not create change
partial amount must not be negative/zero
multi payment line amount must not be negative/zero
split totals must match order total before final settlement
```

Add unit tests for calculation helpers.

## Entitlement gating

Use current entitlement source from POS frontend/API.

Required gating:

```txt
Full payment: no entitlement required.
DP: payments_partial_payment required.
Multi: payments_multi_payment required.
Split: payments_split_bill or payments_split_payment required, follow current SOT.
```

If alias mismatch exists, fix it at SOT/adapter level and document it.

Do not hardcode plan names.

## Backend/API expectations

Audit current backend support before frontend assumptions:

```txt
recordPayment payload fields
payment method enum/string support
partial payment behavior
paid/remaining fields
order status transitions after partial/full payment
ability to store payment metadata/breakdown
split bill persistence, if any
```

If backend does not support a required field, choose the safest option:

```txt
- add small compatible field only if existing schema/API supports it;
- store metadata in existing safe field if available;
- or document limitation and do not fake final paid state.
```

Do not add large payment orchestration changes in P9.

## Required tests

Add/update frontend unit tests and backend/application tests as appropriate.

Minimum test suites:

```txt
payment amount calculation tests
payment mode entitlement gating tests
full payment tests
partial payment tests
multi payment tests
split bill setup/pay tests
recordPayment backend tests if payload/status behavior changes
```

Also keep previous tests passing:

```txt
order lifecycle lock tests
record-payment idempotency tests
order-action direct bypass tests
cashier copy guard tests
business-flow routing tests
```

## Validation commands

Run:

```bash
pnpm --filter @pos/terminal-web type-check
pnpm --filter @pos/terminal-web test
pnpm --filter @pos/application type-check
pnpm --filter @pos/application test
pnpm --filter @pos/api type-check
pnpm --filter @pos/api test
pnpm type-check
```

Run cleanup grep:

```bash
rg -n "orders_queue.*full payment|orders_queue.*recordPayment|recordPayment.*orders_queue|plan.*businessProfile|restaurant_table_service.*businessType|businessType.*restaurant_table_service|GenericPOSPage|features/pos/services|features/pos/mappers" apps packages shared
```

Expected:

```txt
- no full payment dependency on orders_queue;
- no business type mapped to paid workflow mode;
- no legacy frontend POS shims;
- no DP/Multi/Split button path that instantly pays full order incorrectly.
```

## Required report

Create:

```txt
roadmap/business-flows/P9_pos_payment_usability_completion_report.md
```

Report must include:

```txt
1. Summary
2. Current payment flow bugs found
3. Payment method vs payment flow model
4. Full payment implementation/result
5. DP/partial implementation/result
6. Multi payment implementation/result
7. Split bill implementation/result
8. Entitlement gating matrix
9. Backend/API support audit
10. Tests added/updated
11. Validation output
12. Cleanup grep findings
13. Remaining limitations
14. Next recommended phase
```

Update:

```txt
roadmap/business-flows/main.md
PLANS.md
```

if used for progress tracking.

## Completion checklist

- [ ] Cash / Manual Transfer / Manual QRIS available as built-in methods.
- [ ] Full payment always available and works.
- [ ] Full payment does not require orders_queue.
- [ ] DP is independent and entitlement-gated.
- [ ] DP does not accidentally fully settle order when amount < remaining.
- [ ] Multi payment is independent and entitlement-gated.
- [ ] Multi payment requires explicit lines and submit; first click does not auto-settle.
- [ ] Split bill is independent and entitlement-gated.
- [ ] Split bill opens setup, not immediate full payment.
- [ ] Paid/remaining/change calculations are correct.
- [ ] Tests added/updated.
- [ ] Validation documented.
- [ ] P9 report created.

## Commit

```txt
fix(pos): complete cashier payment flow usability
```
