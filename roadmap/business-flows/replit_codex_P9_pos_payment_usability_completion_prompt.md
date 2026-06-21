# Replit/Codex Prompt P9 — POS Payment Usability Completion

Repository: `Rndynt/AuraPoS`

## Goal

Finish the real cashier payment usability flow for AuraPoS.

Stop extending the permission/RBAC track. P8 through P8.3 is enough for backend guard hardening for now. P9 must focus on the actual POS payment experience used by cashiers.

The current problem: multi payment and split bill are not useful yet. Some payment clicks can settle the order immediately as full payment, so DP/multi/split flows are not behaving as independent payment workflows.

P9 must make POS payment flows clear, usable, persisted correctly, and safe.

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

## Required payment persistence contract

Payment order data must be persisted as payment rows. Do not treat a UI button click as proof that the order is paid.

`orders` should store only the order/payment summary fields that already exist or are safely supported by current schema:

```txt
orders
- id
- total_amount / grand_total / current total field
- paid_amount / amount_paid / current paid summary field
- remaining_amount / amount_remaining / computed remaining field if persisted
- payment_status: unpaid | partial | paid
- status / lifecycle status
```

Payment details must live in payment rows, preferably current `order_payments` or the existing equivalent table. If fields are missing, add the smallest compatible migration/schema update needed for P9 and document it in the report.

Target payment row contract:

```txt
order_payments
- id
- tenant_id
- outlet_id nullable if current schema supports it
- order_id
- payment_flow: full | dp | multi | split
- payment_kind: full_payment | down_payment | remaining_payment | multi_line | split_line
- payment_method: cash | manual_transfer | manual_qris
- amount
- received_amount nullable, for cash tendered amount
- change_amount nullable, for cash change only
- status: succeeded | voided | refunded | cancelled, aligned with current schema
- split_id nullable
- sequence
- reference_note nullable, for manual transfer/QRIS note/reference if supported
- metadata/json nullable if current schema supports it
- created_at
```

For split bill, persist the split context if current schema supports it. If not, add a minimal split table or document why a safe session-only implementation is used and do not fake final paid state.

Target split table contract:

```txt
order_bill_splits
- id
- tenant_id
- order_id
- split_no
- split_label nullable
- amount_due
- amount_paid
- status: unpaid | partial | paid
- created_at
- updated_at
```

Hard limits for P9:

```txt
Full payment:
- exactly 1 succeeded payment row for the final full payment event.
- order becomes paid only when the row amount covers remaining amount.

DP / partial payment:
- maximum 2 succeeded payment rows for the simple P9 DP flow.
- row 1 = down_payment.
- row 2 = remaining_payment / final settlement.
- DP amount below total must leave order partial, not paid.

Multi payment:
- maximum 2 payment rows / 2 payment methods for P9.
- each row is `multi_line`.
- total of the 2 rows must equal remaining amount for final settlement.
- first method/line click must never auto-settle the whole order.

Split bill:
- maximum 4 split bills for P9.
- each split can use its own payment method.
- each split payment creates a payment row linked to split_id.
- original order becomes paid only when every split is paid and total paid covers order total.
```

Required recalculation rule:

```txt
paid_amount = SUM(order_payments.amount WHERE order_id = ? AND status = succeeded)
remaining_amount = max(order.total_amount - paid_amount, 0)

if paid_amount = 0:
  payment_status = unpaid

if paid_amount > 0 and paid_amount < total_amount:
  payment_status = partial

if paid_amount >= total_amount:
  payment_status = paid
```

Never set `payment_status = paid` just because cashier selected Full/Multi/Split/DP mode. Only set paid after persisted payment rows cover the total.

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
shared/schema.ts
packages/infrastructure/**
```

Search current payment code:

```bash
rg -n "Full payment|full payment|partial|DP|down payment|multi payment|multiPayment|split bill|splitBill|split payment|payments_partial|payments_multi|payments_split|recordPayment|RecordPayment|PaymentDialog|payment method|manual qris|qris|transfer|cash|tunai|paidAmount|remaining|remaining_amount|amountTendered|order_payments|orderPayments|payment_flow|payment_kind|split_id|bill_splits|order_bill_splits" apps packages shared
```

## Scope

Allowed:

```txt
- Refactor POS payment dialog UX and state so modes are clear.
- Fix full payment, DP/partial, multi payment, and split bill flows.
- Add entitlement gating for optional modes.
- Add payment method selection for Cash, Manual Transfer, Manual QRIS.
- Fix calculation of paid/remaining/change.
- Persist payment rows according to the P9 payment persistence contract.
- Add minimal DB/schema/API changes only if required for POS payment persistence.
- Prevent accidental full settlement when user selected DP/Multi/Split.
- Add tests for payment row persistence and payment flow behavior.
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
- Do not let Multi/Split/DP button click instantly create paid status without persisted rows covering total.
- Do not fake split bill completion if split payment rows do not cover all splits.
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
- successful payment creates exactly 1 payment row with payment_flow=full and payment_kind=full_payment.
- successful payment marks order paid/completed according to current backend flow only after persisted row covers remaining amount.
- cart clears only after success.
- receipt is available after success.
- no orders_queue entitlement required.
```

Tests:

```txt
- full payment with cash creates 1 row and settles full amount.
- full payment with manual QRIS creates 1 row and settles full amount.
- full payment with manual transfer creates 1 row and settles full amount.
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
- cashier enters DP amount.
- paid amount must be > 0 and < remaining for true DP.
- first DP creates 1 payment row with payment_flow=dp and payment_kind=down_payment.
- order remains partially paid / unpaid active according to current lifecycle model.
- UI displays paid amount and remaining amount after DP.
- continuing payment later should pay remaining, not recreate duplicate order.
- final pelunasan creates second payment row with payment_flow=dp and payment_kind=remaining_payment.
- maximum 2 succeeded rows for the simple P9 DP flow: one down_payment and one remaining_payment.
- receipt/payment proof should reflect partial payment if current receipt model supports it.
```

Guardrails:

```txt
- no accidental full paid status when DP amount < remaining.
- no cart clear as if order is fully complete unless current lifecycle expects active order after DP.
- if backend only supports `recordPayment`, use it correctly with partial amount and status mapping.
- block a third DP row in P9 unless a future phase explicitly supports installment schedules.
```

Tests:

```txt
- DP without entitlement hidden or rejected safely.
- DP with entitlement records 1 down_payment row.
- remaining amount is correct.
- order is not marked fully paid when DP < total.
- later remaining payment records second row and completes order.
- third DP/payment row is rejected or not offered in the P9 simple DP model.
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
- P9 maximum: 2 payment lines / 2 selected methods.
- each line has method: Cash / Manual Transfer / Manual QRIS.
- each line has amount.
- submit creates one payment row per line with payment_flow=multi and payment_kind=multi_line.
- sum of payment rows must equal remaining amount for final full settlement.
- if sum is less than remaining, block with clear message unless the user explicitly switches to DP/partial and has entitlement.
- if sum exceeds remaining, allow only cash overpay/change rules where safe; otherwise block.
- must not instantly mark paid when first line is clicked unless total lines cover remaining and user confirms submit.
```

Tests:

```txt
- multi without entitlement hidden or rejected safely.
- multi with cash + QRIS exact total creates 2 rows and completes payment.
- multi with 1 line below total does not complete and does not set paid.
- multi with more than 2 lines is blocked in P9.
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
- P9 maximum: 4 split bills.
- supported split type for P9 minimum: split by amount.
- split by item can be added only if current cart/order item model supports it safely.
- each split has amount due, amount paid, and paid status.
- cashier can pay one split at a time using Cash / Manual Transfer / Manual QRIS.
- each split payment creates a payment row with payment_flow=split, payment_kind=split_line, and split_id.
- original order should only be fully paid/completed when all splits are paid and total payment rows cover the order total.
- if backend lacks persistent split bill model, implement only a safe UI/session model and document limitation; do not fake completed backend state incorrectly.
```

Minimum acceptable P9 split behavior:

```txt
- Split bill opens a real split setup screen/dialog.
- Cashier can create split lines by amount.
- Maximum 4 split lines.
- Paying a split records only that split amount or stores safe pending split state.
- It must not immediately settle the whole order unless all split amounts are paid and confirmed.
```

Tests:

```txt
- split without entitlement hidden or rejected safely.
- split opens setup instead of immediate full payment.
- split by amount creates correct split totals.
- creating more than 4 splits is blocked.
- paying one split creates only one split payment row and does not mark entire order paid unless all splits paid.
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
canCompleteFullPayment
canCompleteMultiPayment
canCompleteSplitPayment
```

Rules:

```txt
remaining = max(total - paid, 0)
paid = sum persisted succeeded payment rows
change applies to cash overpay only
manual transfer/qris should not create change
partial amount must not be negative/zero
multi payment line amount must not be negative/zero
multi payment line count <= 2 in P9
split totals must match order total before final settlement
split count <= 4 in P9
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
order_payments / orderPayments schema
existing order payment method enum/string support
partial payment behavior
paid/remaining fields
order status transitions after partial/full payment
ability to store payment_flow/payment_kind/split_id/sequence/reference_note/metadata
split bill persistence, if any
```

If backend does not support a required field, choose the safest option:

```txt
- add small compatible field only if existing schema/API supports it;
- add minimal split table only if persistent split bill is required and current schema lacks it;
- store metadata in existing safe field if available;
- or document limitation and do not fake final paid state.
```

Do not add large payment orchestration changes in P9.

## Required backend persistence acceptance

The backend/application layer must prove these persistence outcomes:

```txt
Full payment:
- 1 order payment row.
- order payment_status = paid.
- remaining = 0.

DP:
- first payment creates 1 down_payment row.
- order payment_status = partial.
- remaining = total - DP.
- final payment creates 1 remaining_payment row.
- after second row, order payment_status = paid.

Multi:
- exact 2-line cash + QRIS case creates 2 multi_line rows.
- no auto-paid after only first line.
- payment_status = paid only after line total covers remaining.

Split:
- split setup creates up to 4 split records if persistent split model exists.
- paying one split creates one split_line payment row.
- order remains partial/unpaid until every split is paid.
- all splits paid updates order payment_status = paid.
```

## Required tests

Add/update frontend unit tests and backend/application tests as appropriate.

Minimum test suites:

```txt
payment amount calculation tests
payment mode entitlement gating tests
payment row persistence tests
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

Run payment-flow regression grep:

```bash
rg -n "set.*payment_status.*paid|paymentStatus.*paid|mark.*paid|status.*paid" apps/pos-terminal-web/src/features/pos-core apps/pos-terminal-web/src/features/pos-flows packages/application/orders apps/api/src/http/controllers
```

Expected:

```txt
- no full payment dependency on orders_queue;
- no business type mapped to paid workflow mode;
- no legacy frontend POS shims;
- no DP/Multi/Split button path that instantly pays full order incorrectly;
- paid status is derived from persisted successful payment rows covering the order total.
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
4. Payment persistence contract and schema/API changes
5. Full payment implementation/result
6. DP/partial implementation/result
7. Multi payment implementation/result
8. Split bill implementation/result
9. Entitlement gating matrix
10. Backend/API support audit
11. Payment row persistence test matrix
12. Tests added/updated
13. Validation output
14. Cleanup grep findings
15. Remaining limitations
16. Next recommended phase
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
- [ ] Full payment creates exactly 1 payment row.
- [ ] Full payment does not require orders_queue.
- [ ] DP is independent and entitlement-gated.
- [ ] DP first payment creates 1 down_payment row.
- [ ] DP final payment creates 1 remaining_payment row.
- [ ] DP simple P9 flow blocks/does not offer more than 2 succeeded rows.
- [ ] DP does not accidentally fully settle order when amount < remaining.
- [ ] Multi payment is independent and entitlement-gated.
- [ ] Multi payment requires explicit lines and submit; first click does not auto-settle.
- [ ] Multi payment is capped at 2 lines/methods in P9.
- [ ] Multi payment creates one row per line.
- [ ] Split bill is independent and entitlement-gated.
- [ ] Split bill opens setup, not immediate full payment.
- [ ] Split bill is capped at 4 splits in P9.
- [ ] Split payment creates row linked to split_id when persistent split is supported.
- [ ] Order paid status is derived from persisted payment rows covering total.
- [ ] Paid/remaining/change calculations are correct.
- [ ] Tests added/updated.
- [ ] Validation documented.
- [ ] P9 report created.

## Commit

```txt
fix(pos): complete cashier payment flow usability
```
